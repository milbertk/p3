// =====================================================================
//  Booking mappers — translate between the component's shape and the
//  backend BookingBundle shape.
//
//  Component shape:
//    configuration = {
//      id, name, serviceId, mode ("weekly"|"manual"), durationMinutes,
//      active, generalAppointments, lifespan, disabledFrom, disabledTo,
//      weeklySchedule: [ { dayKey, enabled, allDay, ranges: [{start,end,appointments,locationId}] } ],
//      manualAvailability: [ { date, allDay, ranges: [{start,end,appointments,locationId}] } ],
//    }
//
//  Backend bundle:
//    {
//      config: { bookingConfigId, serviceProductId, name, appointmentDurationMinutes,
//                active, generalAppointmentsPerSlot, bookingWindow,
//                disableHolidaysEnabled, disabledFrom, disabledTo, availabilityMode },
//      recurringRanges: [ { dayOfWeek, startTime, endTime, appointments, active, locationId } ],
//      manualSlots:     [ { slotDate, allDay, startTime, endTime, appointments, locationId } ],
//
//  locationId (2026-11-07): optional location of the hours ("" / null = none).
//  customerChoosesLocation (2026-11-08): the customer chooses the location
//    (any active one) when booking; then locationId is null. In the
//    component it is the locationId value CUSTOMER_CHOOSES.
//    }
// =====================================================================

import { CUSTOMER_CHOOSES } from "../../locations/services/locationUtils";

// Location of one block of hours, component -> backend.
const locationOut = (value) => {
  const id = String(value || "").trim();
  if (id === CUSTOMER_CHOOSES) return { locationId: null, customerChoosesLocation: true };
  return { locationId: id || null, customerChoosesLocation: false };
};

// Location of one backend row -> component value.
const locationIn = (row) =>
  row?.customerChoosesLocation ? CUSTOMER_CHOOSES : String(row?.locationId || "");

const DAY_KEY_TO_ENUM = {
  monday: "MONDAY",
  tuesday: "TUESDAY",
  wednesday: "WEDNESDAY",
  thursday: "THURSDAY",
  friday: "FRIDAY",
  saturday: "SATURDAY",
  sunday: "SUNDAY",
};

const ENUM_TO_DAY_KEY = Object.fromEntries(
  Object.entries(DAY_KEY_TO_ENUM).map(([k, v]) => [v, k]),
);

const DAY_KEYS = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
];

let localIdCounter = 0;
function localId(prefix) {
  localIdCounter += 1;
  return `${prefix}-${Date.now()}-${localIdCounter}`;
}

// "" / null / undefined -> null; a number-like -> Number; else null.
function toNullableInt(value) {
  const text = String(value ?? "").trim();
  if (text === "") return null;
  const parsed = Number(text);
  if (Number.isNaN(parsed) || parsed < 1) return null;
  return Math.trunc(parsed);
}

function toNullableString(value) {
  const text = String(value ?? "").trim();
  return text === "" ? null : text;
}

// ---------------------------------------------------------------------
// COMPONENT -> BACKEND (for saving)
// ---------------------------------------------------------------------
// options.today ("YYYY-MM-DD", 2026-11-08): dates before it are history and
// are not sent (the backend keeps them and would refuse them twice).
export function configurationToBundle(configuration, options = {}) {
  const today = String(options.today || "");
  const mode = configuration.mode === "manual" ? "MANUAL" : "RECURRING";

  const config = {
    bookingConfigId: configuration.id || "",
    serviceProductId: String(configuration.serviceId || "").trim(),
    name: String(configuration.name || "").trim(),
    appointmentDurationMinutes: Number(configuration.durationMinutes) || 60,
    active: Boolean(configuration.active),
    generalAppointmentsPerSlot: Number(configuration.generalAppointments) || 1,
    bookingWindow: configuration.lifespan || "ONE_MONTH",
    disableHolidaysEnabled: Boolean(
      toNullableString(configuration.disabledFrom) ||
        toNullableString(configuration.disabledTo),
    ),
    disabledFrom: toNullableString(configuration.disabledFrom),
    disabledTo: toNullableString(configuration.disabledTo),
    availabilityMode: mode,
  };

  // Only the hours of the chosen mode are sent (2026-11-08): saving deletes
  // the hours of the other mode (booked appointments are kept).
  // Recurring ranges: one backend row per (enabled day x range).
  const recurringRanges = [];
  (mode === "RECURRING" ? configuration.weeklySchedule || [] : []).forEach((day) => {
    if (!day.enabled) return;
    (day.ranges || []).forEach((range) => {
      recurringRanges.push({
        dayOfWeek: DAY_KEY_TO_ENUM[day.dayKey],
        startTime: String(range.start || "").trim(),
        endTime: String(range.end || "").trim(),
        appointments: toNullableInt(range.appointments),
        active: true,
        ...locationOut(range.locationId),
      });
    });
  });

  // Manual slots: one backend row per (date x range), or one all-day row.
  const manualSlots = [];
  (mode === "MANUAL" ? configuration.manualAvailability || [] : []).forEach((entry) => {
    if (today && String(entry.date || "") < today) return;
    if (entry.allDay) {
      manualSlots.push({
        slotDate: String(entry.date || "").trim(),
        allDay: true,
        startTime: null,
        endTime: null,
        appointments: toNullableInt(
          entry.ranges && entry.ranges[0]
            ? entry.ranges[0].appointments
            : "",
        ),
        ...locationOut(entry.ranges && entry.ranges[0] ? entry.ranges[0].locationId : ""),
      });
      return;
    }
    (entry.ranges || []).forEach((range) => {
      manualSlots.push({
        slotDate: String(entry.date || "").trim(),
        allDay: false,
        startTime: String(range.start || "").trim(),
        endTime: String(range.end || "").trim(),
        appointments: toNullableInt(range.appointments),
        ...locationOut(range.locationId),
      });
    });
  });

  return { config, recurringRanges, manualSlots };
}

// ---------------------------------------------------------------------
// BACKEND -> COMPONENT (for loading after search/select)
// ---------------------------------------------------------------------
export function bundleToConfiguration(bundle) {
  const config = bundle?.config || {};
  const recurringRanges = Array.isArray(bundle?.recurringRanges)
    ? bundle.recurringRanges
    : [];
  const manualSlots = Array.isArray(bundle?.manualSlots)
    ? bundle.manualSlots
    : [];

  // Rebuild weekly schedule (all 7 days; fill ranges from backend rows).
  const weeklySchedule = DAY_KEYS.map((dayKey) => {
    const dayRanges = recurringRanges
      .filter((r) => ENUM_TO_DAY_KEY[r.dayOfWeek] === dayKey)
      .map((r) => ({
        id: localId("range"),
        start: String(r.startTime || "").slice(0, 5),
        end: String(r.endTime || "").slice(0, 5),
        appointments:
          r.appointments === null || r.appointments === undefined
            ? ""
            : String(r.appointments),
        locationId: locationIn(r),
      }));

    return {
      dayKey,
      enabled: dayRanges.length > 0,
      allDay: false,
      ranges:
        dayRanges.length > 0
          ? dayRanges
          : [{ id: localId("range"), start: "08:00", end: "17:00", appointments: "", locationId: "" }],
    };
  });

  // Rebuild manual availability: group backend slots by date.
  const byDate = new Map();
  manualSlots.forEach((slot) => {
    const date = String(slot.slotDate || "").slice(0, 10);
    if (!date) return;

    if (!byDate.has(date)) {
      byDate.set(date, { date, allDay: false, ranges: [] });
    }
    const entry = byDate.get(date);

    if (slot.allDay) {
      entry.allDay = true;
      entry.ranges = [
        {
          id: localId("range"),
          start: "08:00",
          end: "17:00",
          appointments:
            slot.appointments === null || slot.appointments === undefined
              ? ""
              : String(slot.appointments),
          locationId: locationIn(slot),
        },
      ];
      return;
    }

    entry.ranges.push({
      id: localId("range"),
      start: String(slot.startTime || "").slice(0, 5),
      end: String(slot.endTime || "").slice(0, 5),
      appointments:
        slot.appointments === null || slot.appointments === undefined
          ? ""
          : String(slot.appointments),
      locationId: locationIn(slot),
    });
  });

  const manualAvailability = Array.from(byDate.values());

  return {
    id: config.bookingConfigId || null,
    name: String(config.name || ""),
    serviceId: String(config.serviceProductId || ""),
    mode: config.availabilityMode === "MANUAL" ? "manual" : "weekly",
    durationMinutes: Number(config.appointmentDurationMinutes) || 60,
    active: config.active !== false,
    generalAppointments: Number(config.generalAppointmentsPerSlot) || 1,
    lifespan: config.bookingWindow || "ONE_MONTH",
    disabledFrom: config.disabledFrom || "",
    disabledTo: config.disabledTo || "",
    weeklySchedule,
    manualAvailability,
  };
}