import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import {
  FaCalendarDay,
  FaCalendarWeek,
  FaChevronLeft,
  FaChevronRight,
  FaClock,
  FaFloppyDisk,
  FaLocationDot,
  FaLock,
  FaMagnifyingGlass,
  FaPlus,
  FaXmark,
  FaTrash,
  FaTriangleExclamation,
} from "react-icons/fa6";
import "./BookingAvailabilityMaintenance.scss";

import SaveBookingService from "../services/SaveBookingService";
import SelectBookingService from "../services/SelectBookingService";
import SearchBookingsService from "../services/SearchBookingsService";
import SearchProductsService from "../../products/services/SearchProductsService";
import ServiceAutocomplete from "./ServiceAutocomplete";
import {
  configurationToBundle,
  bundleToConfiguration,
} from "./Bookingmappers";
import LocationsService from "../../locations/services/LocationsService";
import {
  CUSTOMER_CHOOSES,
  overlapMessage,
  overlapsFromError,
} from "../../locations/services/locationUtils";

const SELECTED_COMPANY_STORAGE_KEY = "selectedCompany";

const saveBookingService = new SaveBookingService();
const selectBookingService = new SelectBookingService();
const searchBookingsService = new SearchBookingsService();
const searchProductsService = new SearchProductsService();
const locationsService = new LocationsService();

function readSelectedCompanyId() {
  try {
    const raw = localStorage.getItem(SELECTED_COMPANY_STORAGE_KEY);
    if (!raw) return "";
    const parsed = JSON.parse(raw);
    return String(parsed?.companyId || parsed?.id || "").trim();
  } catch {
    return "";
  }
}

const DURATION_OPTIONS = [30, 60, 90, 120, 180];
const LIFESPAN_OPTIONS = [
  "ONE_WEEK",
  "ONE_MONTH",
  "THREE_MONTHS",
  "SIX_MONTHS",
  "ONE_YEAR",
];
const DAY_KEYS = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
];

const MOCK_SERVICES = [
  {
    id: "consulting",
    nameKey: "bookingAvailabilityMaintenance.mock.services.consulting",
  },
  {
    id: "installation",
    nameKey: "bookingAvailabilityMaintenance.mock.services.installation",
  },
  {
    id: "technical-review",
    nameKey: "bookingAvailabilityMaintenance.mock.services.technicalReview",
  },
];

const createRange = (start = "08:00", end = "17:00") => ({
  id: `range-${Date.now()}-${Math.random().toString(16).slice(2)}`,
  start,
  end,
  appointments: "", // empty -> uses the general appointments count
  locationId: "", // optional location of these hours (2026-11-07)
});

const createWeeklySchedule = () =>
  DAY_KEYS.map((dayKey, index) => ({
    dayKey,
    enabled: index < 5,
    allDay: false,
    ranges: [createRange("08:00", index === 2 ? "12:00" : "17:00")],
  }));

const dateKeyFromOffset = (offset) => {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() + offset);
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
};

const MOCK_MANUAL_DATE_1 = dateKeyFromOffset(3);
const MOCK_MANUAL_DATE_2 = dateKeyFromOffset(6);
const TODAY_DATE_KEY = dateKeyFromOffset(0);

const EMPTY_CONFIGURATION = {
  id: null,
  name: "",
  serviceId: "",
  mode: "weekly",
  durationMinutes: 60,
  active: true,
  // Default capacity applied to any range with no explicit appointments value.
  generalAppointments: 1,
  // Recurring booking window (how far ahead customers can book).
  lifespan: "ONE_MONTH",
  // Optional single date range to disable booking (e.g. holidays).
  disabledFrom: "",
  disabledTo: "",
  weeklySchedule: createWeeklySchedule(),
  manualAvailability: [],
};

const MOCK_EXISTING_CONFIGURATIONS = [
  {
    id: "booking-config-consulting",
    name: "Standard consulting schedule",
    serviceId: "consulting",
    mode: "weekly",
    durationMinutes: 60,
    active: true,
    weeklySchedule: createWeeklySchedule(),
    manualAvailability: [],
  },
  {
    id: "booking-config-special-reviews",
    name: "Special technical review dates",
    serviceId: "technical-review",
    mode: "manual",
    durationMinutes: 30,
    active: true,
    weeklySchedule: createWeeklySchedule(),
    manualAvailability: [
      {
        date: MOCK_MANUAL_DATE_1,
        allDay: false,
        ranges: [createRange("09:00", "12:00"), createRange("14:00", "17:00")],
      },
      {
        date: MOCK_MANUAL_DATE_2,
        allDay: false,
        ranges: [createRange("10:00", "14:00")],
      },
    ],
  },
];

const cloneConfiguration = (configuration) =>
  JSON.parse(JSON.stringify(configuration));

const parseDateKey = (dateKey) => {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(year, month - 1, day, 12);
};

const formatDateKey = (date) =>
  [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");

const timeToMinutes = (time) => {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
};

const formatTime = (minutes, locale) => {
  const date = new Date(2000, 0, 1, 0, minutes);
  return new Intl.DateTimeFormat(locale, {
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
};

// "Monday, November 9" for a YYYY-MM-DD date (2026-11-08).
const formatDateLong = (dateKey, locale) => {
  const [year, month, day] = String(dateKey || "").split("-").map(Number);
  if (!year || !month || !day) return String(dateKey || "");
  return new Intl.DateTimeFormat(locale, { weekday: "long", month: "long", day: "numeric" }).format(
    new Date(year, month - 1, day),
  );
};

const generateSlots = (availability, durationMinutes, locale) => {
  if (!availability) return [];

  const ranges = availability.allDay
    ? [{ start: "00:00", end: "24:00" }]
    : availability.ranges;

  return ranges.flatMap((range) => {
    const slots = [];
    const start = timeToMinutes(range.start);
    const end = timeToMinutes(range.end);

    for (let current = start; current + durationMinutes <= end; current += durationMinutes) {
      slots.push({
        start: formatTime(current, locale),
        end: formatTime(current + durationMinutes, locale),
      });
    }

    return slots;
  });
};

// Ranges of one day must not overlap. Only ranges in two DIFFERENT fixed
// locations may overlap, and only when the company switch "We can attend in
// more than one location at the same time" is on (allowDifferentPlaces,
// 2026-11-08); then each location has its own appointments. A range where the
// customer chooses the location can be in any location, so it never overlaps
// another range. Returns the first problem, or null.
const rangeProblem = (ranges, duration, allowDifferentPlaces = false) => {
  const items = ranges.map((range, index) => ({
    index,
    start: timeToMinutes(range.start),
    end: timeToMinutes(range.end),
    locationId: String(range.locationId || ""),
  }));
  const tooShort = items.find((item) => !(item.end - item.start >= duration));
  if (tooShort) return { kind: "short", a: tooShort.index };
  const differentPlaces = (a, b) =>
    allowDifferentPlaces &&
    a.locationId &&
    b.locationId &&
    a.locationId !== CUSTOMER_CHOOSES &&
    b.locationId !== CUSTOMER_CHOOSES &&
    a.locationId !== b.locationId;

  for (const range of items) {
    const other = items.find(
      (candidate) =>
        candidate.index > range.index &&
        range.start < candidate.end &&
        candidate.start < range.end &&
        !differentPlaces(range, candidate),
    );
    if (other) return { kind: "overlap", a: range.index, b: other.index };
  }
  return null;
};

const addMinutes = (time, minutes) => {
  const total = Math.min(timeToMinutes(time) + minutes, 24 * 60 - 1);
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
};

// A new range lasts one appointment (2026-11-08): it starts where the last
// range ends (09:00 for the first one).
const nextRange = (ranges, durationMinutes) => {
  const duration = Number(durationMinutes) > 0 ? Number(durationMinutes) : 60;
  const last = ranges.length ? ranges[ranges.length - 1] : null;
  let start = last && last.end ? last.end : "09:00";
  if (timeToMinutes(start) + duration > 24 * 60) start = "09:00";
  return createRange(start, addMinutes(start, duration));
};

const getCalendarCells = (monthDate) => {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const mondayFirstOffset = (firstDay + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  return [
    ...Array.from({ length: mondayFirstOffset }, (_, index) => ({
      key: `blank-start-${index}`,
      blank: true,
    })),
    ...Array.from({ length: daysInMonth }, (_, index) => {
      const date = new Date(year, month, index + 1, 12);
      return {
        key: formatDateKey(date),
        date,
        dayNumber: index + 1,
        blank: false,
      };
    }),
  ];
};

/**
 * Creates availability rules only. Customer requests and approval are separate flows.
 *
 * Replace the mock constants with service responses later, or provide onSearch/onSave.
 */
// {{name}} values in a fallback text.
const fill = (text, values = {}) =>
  String(text).replace(/{{\s*(\w+)\s*}}/g, (all, name) => (values[name] !== undefined ? values[name] : all));

// The locations hint can be closed; it stays closed in this browser.
const HINT_CLOSED_KEY = "alephk.bookingSchedules.locationsHintClosed";
const readHintClosed = () => {
  try {
    return window.localStorage.getItem(HINT_CLOSED_KEY) === "1";
  } catch {
    return false;
  }
};
const saveHintClosed = () => {
  try {
    window.localStorage.setItem(HINT_CLOSED_KEY, "1");
  } catch {
    // Without storage the hint just shows again next time.
  }
};

export default function BookingAvailabilityMaintenance({
  t,
  locale = "en",
  onSave,
  onSearch,
}) {
  const appLocale = locale.toLowerCase().startsWith("es") ? "es-CR" : "en-US";
  const initialConfiguration = cloneConfiguration(EMPTY_CONFIGURATION);
  const initialManualDate = TODAY_DATE_KEY;

  const [configuration, setConfiguration] = useState(initialConfiguration);
  const [message, setMessage] = useState("");
  const [selectedDate, setSelectedDate] = useState(initialManualDate);
  const [calendarMonth, setCalendarMonth] = useState(
    new Date(
      parseDateKey(initialManualDate).getFullYear(),
      parseDateKey(initialManualDate).getMonth(),
      1,
    ),
  );
  const [previewDayKey, setPreviewDayKey] = useState("monday");

  // Real-data state.
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);
  // Service names by id (label of the selected service).
  // The service field itself searches the server while typing.
  const [serviceNames, setServiceNames] = useState({});
  const [servicesLoaded, setServicesLoaded] = useState(false);
  // Ids of the services that already have a schedule ("Has schedule" label).
  const [scheduledServiceIds, setScheduledServiceIds] = useState([]);
  // "This service already has a schedule": { id, serviceName, reason }.
  const [existingSchedule, setExistingSchedule] = useState(null);
  // Locations of the company (2026-11-07) and the clashes of the last save.
  // locations stays empty (no field) while "We use locations" is off (2026-11-08).
  const [locations, setLocations] = useState([]);
  // Hint "create your locations first" (2026-11-08): null = not known yet.
  const [locationsOn, setLocationsOn] = useState(null);
  const [locationsSameTime, setLocationsSameTime] = useState(false);
  // Mode change that deletes saved hours, waiting for confirmation (2026-11-08).
  const [pendingMode, setPendingMode] = useState(null);
  const [hintClosed, setHintClosed] = useState(readHintClosed);
  const navigate = useNavigate();
  const [overlaps, setOverlaps] = useState([]);
  // Snapshot of the form when it was loaded/created, to detect unsaved changes.
  const pristineRef = useRef(JSON.stringify(initialConfiguration));

  // Load service names for the labels (up to 200, the backend maximum).
  useEffect(() => {
    let active = true;
    const companyId = readSelectedCompanyId();
    if (!companyId) return undefined;

    searchProductsService
      .getProducts({ companyId, filters: { productType: "SERVICE", limit: 200 } })
      .then((products) => {
        if (!active) return;
        const names = {};
        (Array.isArray(products) ? products : []).forEach((product) => {
          const id = String(
            product?.productInternalId || product?.product_internal_id || "",
          );
          if (id) names[id] = String(product?.name || "");
        });
        setServiceNames((current) => ({ ...names, ...current }));
        setServicesLoaded(true);
      })
      .catch(() => {
        if (active) setServicesLoaded(true);
      });

    return () => {
      active = false;
    };
  }, []);

  // Locations of the company (active and disabled, to show the name of a
  // disabled one that is still on some hours). Only when the company turned
  // on "We use locations" (2026-11-08); otherwise the screen works as before
  // (no location field) and the saved locations of the hours are kept.
  useEffect(() => {
    let active = true;
    const companyId = readSelectedCompanyId();
    if (!companyId) return undefined;
    locationsService
      .forForms({ companyId })
      .then(({ enabled, sameTime, locations: list }) => {
        if (!active) return;
        setLocationsOn(Boolean(enabled));
        setLocationsSameTime(Boolean(sameTime));
        setLocations(enabled ? list : []);
      })
      .catch(() => {
        // Without the list the screen works as before (no location field).
      });
    return () => {
      active = false;
    };
  }, []);

  const tl = (key, fallback, options = {}) => {
    try {
      const value = t(key, { defaultValue: fallback, ...options });
      return !value || value === key ? fill(fallback, options) : value;
    } catch {
      return fill(fallback, options);
    }
  };

  // "Create your locations first" (2026-11-08): shown while the Location
  // field is hidden because "We use locations" is off or there is no active
  // location yet. Closing it keeps it closed in this browser.
  const renderLocationsHint = () => {
    if (locationsOn === null || hintClosed) return null;
    const activeCount = locations.filter((location) => location.active).length;
    if (locationsOn && activeCount > 0) return null;
    const text = locationsOn
      ? tl(
          "bookingAvailabilityMaintenance.locationsHint.noActive",
          "Locations is on, but you have no active location. Create one in Locations to choose it here.",
        )
      : tl(
          "bookingAvailabilityMaintenance.locationsHint.off",
          "Do you attend in more than one place? First turn on \"We use locations\" and create your locations in Locations. Then each block of hours can have a location, or let the customer choose.",
        );
    return (
      <aside className="booking-locations-hint" role="note">
        <FaLocationDot className="booking-locations-hint__icon" aria-hidden="true" />
        <p>{text}</p>
        <button
          type="button"
          className="booking-locations-hint__go"
          onClick={() => navigate("/shao/locations")}
        >
          {tl("bookingAvailabilityMaintenance.locationsHint.go", "Go to Locations")}
        </button>
        <button
          type="button"
          className="booking-locations-hint__close"
          onClick={() => {
            saveHintClosed();
            setHintClosed(true);
          }}
          aria-label={tl("bookingAvailabilityMaintenance.locationsHint.close", "Close")}
          title={tl("bookingAvailabilityMaintenance.locationsHint.close", "Close")}
        >
          <FaXmark aria-hidden="true" />
        </button>
      </aside>
    );
  };

  // Location field of one block of hours (only when the company uses
  // locations and has some). "Customer chooses" = any active location, the
  // customer decides when booking (2026-11-08).
  const renderLocationSelect = (value, onChange, id) => {
    if (locations.length === 0) return null;
    const current = String(value || "");
    const options = locations.filter(
      (location) => location.active || location.locationId === current,
    );
    const choiceHint =
      current === CUSTOMER_CHOOSES
        ? tl(
            "bookingAvailabilityMaintenance.fields.customerChoosesHint",
            "The store shows these hours in every active location; the customer picks one.",
          )
        : "";
    return (
      <label className="booking-time-range__location">
        <span>
          <FaLocationDot aria-hidden="true" />{" "}
          {tl("bookingAvailabilityMaintenance.fields.location", "Location")}
        </span>
        <select id={id} value={current} onChange={(event) => onChange(event.target.value)}>
          <option value="">
            {tl("bookingAvailabilityMaintenance.fields.noLocation", "No location")}
          </option>
          <option value={CUSTOMER_CHOOSES}>
            {tl(
              "bookingAvailabilityMaintenance.fields.customerChooses",
              "Customer chooses (any active location)",
            )}
          </option>
          {options.map((location) => (
            <option key={location.locationId} value={location.locationId}>
              {location.name}
              {location.active
                ? ""
                : ` (${tl("bookingAvailabilityMaintenance.fields.locationDisabled", "disabled")})`}
            </option>
          ))}
        </select>
        {choiceHint && <small className="booking-time-range__location-hint">{choiceHint}</small>}
      </label>
    );
  };
  // Short placeholder of a range's appointments: "General (1)" (2026-11-08).
  const generalPlaceholder = `${t("bookingAvailabilityMaintenance.fields.usesGeneral")} (${
    String(configuration.generalAppointments || "").trim() || "1"
  })`;
  const rangeRowClass = `booking-time-range${locations.length > 0 ? " booking-time-range--with-location" : ""}`;

  // Load which services already have a schedule (up to 200 schedules).
  const loadScheduledServices = async () => {
    const companyId = readSelectedCompanyId();
    if (!companyId) return;
    try {
      const schedules = await searchBookingsService.getBookings({
        companyId,
        filters: { limit: 200 },
      });
      setScheduledServiceIds(
        (Array.isArray(schedules) ? schedules : [])
          .map((item) =>
            String(item?.serviceProductId || item?.service_product_id || ""),
          )
          .filter(Boolean),
      );
    } catch (error) {
      // Only a visual label: the screen keeps working without it.
      console.error("Error loading the services with a schedule:", error);
    }
  };

  useEffect(() => {
    loadScheduledServices();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const calendarCells = useMemo(
    () => getCalendarCells(calendarMonth),
    [calendarMonth],
  );

  const selectedManualDay = useMemo(
    () =>
      configuration.manualAvailability.find(
        (availability) => availability.date === selectedDate,
      ),
    [configuration.manualAvailability, selectedDate],
  );

  const enabledWeeklyDays = configuration.weeklySchedule.filter(
    (day) => day.enabled,
  );
  const activePreviewDay =
    enabledWeeklyDays.find((day) => day.dayKey === previewDayKey) ||
    enabledWeeklyDays[0];

  const previewAvailability =
    configuration.mode === "weekly" ? activePreviewDay : selectedManualDay;

  const generatedSlots = useMemo(
    () =>
      generateSlots(
        previewAvailability,
        Number(configuration.durationMinutes),
        appLocale,
      ),
    [appLocale, configuration.durationMinutes, previewAvailability],
  );

  // The same spaces, one row per location (2026-11-08). Without locations:
  // one row without a name, as before.
  const previewGroups = useMemo(() => {
    if (!previewAvailability) return [];
    const duration = Number(configuration.durationMinutes);
    if (locations.length === 0 || previewAvailability.allDay) {
      return [{ key: "all", label: "", slots: generatedSlots }];
    }
    const groups = [];
    const byKey = new Map();
    previewAvailability.ranges.forEach((range) => {
      const key = String(range.locationId || "");
      if (!byKey.has(key)) {
        const group = { key, ranges: [] };
        byKey.set(key, group);
        groups.push(group);
      }
      byKey.get(key).ranges.push(range);
    });
    return groups.map((group) => ({
      key: group.key || "none",
      label:
        group.key === CUSTOMER_CHOOSES
          ? tl(
              "bookingAvailabilityMaintenance.fields.customerChooses",
              "Customer chooses (any active location)",
            )
          : group.key
            ? locations.find((location) => location.locationId === group.key)?.name || group.key
            : tl("bookingAvailabilityMaintenance.fields.noLocation", "No location"),
      slots: generateSlots({ allDay: false, ranges: group.ranges }, duration, appLocale),
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [previewAvailability, generatedSlots, locations, configuration.durationMinutes, appLocale]);

  const monthLabel = new Intl.DateTimeFormat(appLocale, {
    month: "long",
    year: "numeric",
  }).format(calendarMonth);

  const selectedDateLabel = new Intl.DateTimeFormat(appLocale, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(parseDateKey(selectedDate));

  const updateConfigurationField = (event) => {
    const { name, value, checked, type } = event.target;
    setConfiguration((current) => ({
      ...current,
      [name]: type === "checkbox" ? checked : value,
    }));
    setMessage("");
  };

  // A message under the Save button AND as a toast (2026-11-08), so it is
  // easy to notice. kind: success | error | warning | info.
  const notify = (kind, text) => {
    setMessage(text || "");
    if (!text) return;
    const show = toast[kind] || toast;
    show(text, { toastId: `booking-${kind}-${text}` });
  };

  // Saved hours of each mode (what the database has now).
  const savedModes = () => {
    try {
      const saved = JSON.parse(pristineRef.current || "{}");
      return {
        weekly: (saved.weeklySchedule || []).some((day) => day.enabled),
        manual: (saved.manualAvailability || []).length > 0,
      };
    } catch {
      return { weekly: false, manual: false };
    }
  };

  const modeName = (mode) =>
    mode === "manual"
      ? t("bookingAvailabilityMaintenance.manual.title")
      : t("bookingAvailabilityMaintenance.mode.weekly.title");

  const applyMode = (mode) => {
    setConfiguration((current) => ({ ...current, mode }));
    setPendingMode(null);
    notify(
      "info",
      tl(
        "bookingAvailabilityMaintenance.modeSwitch.done",
        "Now using: {{mode}}. Only these hours are saved and published.",
        { mode: modeName(mode) },
      ),
    );
  };

  // One mode only: leaving a mode that has saved hours asks first, because
  // saving deletes them (booked appointments are kept).
  const changeMode = (mode) => {
    if (mode === configuration.mode) return;
    const saved = savedModes();
    const leavingSaved = configuration.id && saved[configuration.mode];
    if (leavingSaved) {
      setPendingMode(mode);
      return;
    }
    applyMode(mode);
  };

  // The saved schedule used the other mode: its hours go when saving.
  const deletesOnSave = () => {
    if (!configuration.id) return null;
    const saved = savedModes();
    const other = configuration.mode === "weekly" ? "manual" : "weekly";
    return saved[other] ? other : null;
  };

  const handleNew = () => {
    const fresh = cloneConfiguration(EMPTY_CONFIGURATION);
    setConfiguration(fresh);
    pristineRef.current = JSON.stringify(fresh);
    setExistingSchedule(null);
    setOverlaps([]);
    setMessage(t("bookingAvailabilityMaintenance.messages.newReady"));
  };

  const hasUnsavedChanges = () =>
    JSON.stringify(configuration) !== pristineRef.current;

  // Label of the selected service (the schedule name equals the service name).
  const selectedServiceName =
    serviceNames[configuration.serviceId] || configuration.name || "";
  // Step 1 done: the rest of the form opens (2026-11-08).
  const serviceChosen = Boolean(configuration.serviceId);

  // Load the full bundle for a selected booking and fill the form.
  const handleSelectBooking = async (bookingConfigId) => {
    const companyId = readSelectedCompanyId();
    if (!companyId || !bookingConfigId) return;

    setSearching(true);
    setMessage("");

    try {
      const bundle = await selectBookingService.getBookingBundle({
        companyId,
        bookingConfigId,
      });

      if (!bundle) {
        setMessage(t("bookingAvailabilityMaintenance.messages.notFound"));
        return;
      }

      const loaded = bundleToConfiguration(bundle);
      setConfiguration(loaded);
      pristineRef.current = JSON.stringify(loaded);
      setExistingSchedule(null);
      setPreviewDayKey(
        loaded.weeklySchedule.find((day) => day.enabled)?.dayKey || "monday",
      );

      // The first open date from today on (past dates are history), or
      // today (2026-11-08).
      {
        const nextSelectedDate =
          loaded.manualAvailability
            .map((availability) => availability.date)
            .filter((date) => date >= TODAY_DATE_KEY)
            .sort()[0] || TODAY_DATE_KEY;
        const parsedDate = parseDateKey(nextSelectedDate);
        setSelectedDate(nextSelectedDate);
        setCalendarMonth(
          new Date(parsedDate.getFullYear(), parsedDate.getMonth(), 1),
        );
      }

      setMessage(t("bookingAvailabilityMaintenance.messages.loaded"));
      return true;
    } catch (error) {
      console.error("Error selecting booking:", error);
      setMessage(
        error?.message ||
          t("bookingAvailabilityMaintenance.messages.selectError"),
      );
      return false;
    } finally {
      setSearching(false);
    }
  };

  // Open the existing schedule of a service and say so.
  const openExistingSchedule = async (bookingConfigId, serviceName) => {
    setExistingSchedule(null);
    const opened = await handleSelectBooking(bookingConfigId);
    if (opened) {
      notify(
        "info",
        t("bookingAvailabilityMaintenance.messages.editingExisting", {
          service: serviceName,
        }),
      );
    }
  };

  // The service is the key: one schedule per service. Choosing a service
  // opens its schedule when it has one; otherwise the form becomes a new
  // schedule for that service. The schedule name is the service name.
  const handleSelectService = async (service) => {
    if (!service?.id) return;
    setServiceNames((current) => ({ ...current, [service.id]: service.name }));
    setExistingSchedule(null);
    if (service.id === configuration.serviceId) return;

    const companyId = readSelectedCompanyId();
    if (!companyId) {
      setMessage(t("bookingAvailabilityMaintenance.messages.missingCompany"));
      return;
    }

    let existingId = "";
    try {
      const results = await searchBookingsService.getBookings({
        companyId,
        filters: { serviceProductId: service.id, limit: 1 },
      });
      const existing = Array.isArray(results) ? results[0] : null;
      existingId = String(
        existing?.bookingConfigId || existing?.booking_config_id || "",
      );
    } catch (error) {
      console.error("Error checking the service schedule:", error);
      setMessage(t("bookingAvailabilityMaintenance.messages.checkServiceError"));
      return;
    }

    if (existingId && existingId !== configuration.id) {
      if (hasUnsavedChanges()) {
        // Do not replace the user's work without asking.
        setExistingSchedule({
          id: existingId,
          serviceName: service.name,
          reason: "unsaved",
        });
        return;
      }
      await openExistingSchedule(existingId, service.name);
      return;
    }

    // No schedule for this service yet: a new schedule for it. When the form
    // showed another service's schedule, start from a clean form (that other
    // schedule is never moved to this service).
    setConfiguration((current) =>
      current.id
        ? {
            ...cloneConfiguration(EMPTY_CONFIGURATION),
            serviceId: service.id,
            name: service.name,
          }
        : { ...current, serviceId: service.id, name: service.name },
    );
    notify(
      "info",
      t("bookingAvailabilityMaintenance.messages.newForService", {
        service: service.name,
      }),
    );
  };

  const updateWeeklyDay = (dayKey, field, value) => {
    setConfiguration((current) => ({
      ...current,
      weeklySchedule: current.weeklySchedule.map((day) =>
        day.dayKey === dayKey ? { ...day, [field]: value } : day,
      ),
    }));
    setMessage("");
  };

  const updateWeeklyRange = (dayKey, rangeId, field, value) => {
    setConfiguration((current) => ({
      ...current,
      weeklySchedule: current.weeklySchedule.map((day) =>
        day.dayKey === dayKey
          ? {
              ...day,
              ranges: day.ranges.map((range) =>
                range.id === rangeId ? { ...range, [field]: value } : range,
              ),
            }
          : day,
      ),
    }));
    setMessage("");
  };

  const addWeeklyRange = (dayKey) => {
    setConfiguration((current) => ({
      ...current,
      weeklySchedule: current.weeklySchedule.map((day) =>
        day.dayKey === dayKey
          ? { ...day, ranges: [...day.ranges, nextRange(day.ranges, current.durationMinutes)] }
          : day,
      ),
    }));
  };

  const removeWeeklyRange = (dayKey, rangeId) => {
    setConfiguration((current) => ({
      ...current,
      weeklySchedule: current.weeklySchedule.map((day) =>
        day.dayKey === dayKey
          ? {
              ...day,
              ranges: day.ranges.filter((range) => range.id !== rangeId),
            }
          : day,
      ),
    }));
  };

  const selectCalendarDate = (dateKey) => {
    setSelectedDate(dateKey);
    setMessage("");
  };

  const changeCalendarMonth = (amount) => {
    setCalendarMonth(
      (current) =>
        new Date(current.getFullYear(), current.getMonth() + amount, 1),
    );
  };

  const openSelectedDate = () => {
    if (selectedManualDay) return;
    setConfiguration((current) => ({
      ...current,
      manualAvailability: [
        ...current.manualAvailability,
        {
          date: selectedDate,
          allDay: false,
          ranges: [nextRange([], current.durationMinutes)],
        },
      ],
    }));
    setMessage("");
  };

  const closeSelectedDate = () => {
    setConfiguration((current) => ({
      ...current,
      manualAvailability: current.manualAvailability.filter(
        (availability) => availability.date !== selectedDate,
      ),
    }));
    setMessage("");
  };

  const updateManualDay = (field, value) => {
    setConfiguration((current) => ({
      ...current,
      manualAvailability: current.manualAvailability.map((availability) =>
        availability.date === selectedDate
          ? { ...availability, [field]: value }
          : availability,
      ),
    }));
    setMessage("");
  };

  const updateManualRange = (rangeId, field, value) => {
    setConfiguration((current) => ({
      ...current,
      manualAvailability: current.manualAvailability.map((availability) =>
        availability.date === selectedDate
          ? {
              ...availability,
              ranges: availability.ranges.map((range) =>
                range.id === rangeId ? { ...range, [field]: value } : range,
              ),
            }
          : availability,
      ),
    }));
    setMessage("");
  };

  const addManualRange = () => {
    setConfiguration((current) => ({
      ...current,
      manualAvailability: current.manualAvailability.map((availability) =>
        availability.date === selectedDate
          ? {
              ...availability,
              ranges: [
                ...availability.ranges,
                nextRange(availability.ranges, current.durationMinutes),
              ],
            }
          : availability,
      ),
    }));
  };

  const removeManualRange = (rangeId) => {
    setConfiguration((current) => ({
      ...current,
      manualAvailability: current.manualAvailability.map((availability) =>
        availability.date === selectedDate
          ? {
              ...availability,
              ranges: availability.ranges.filter(
                (range) => range.id !== rangeId,
              ),
            }
          : availability,
      ),
    }));
  };

  const validateConfiguration = () => {
    if (!configuration.serviceId) {
      return "bookingAvailabilityMaintenance.messages.required";
    }

    const duration = Number(configuration.durationMinutes);
    const activeAvailabilities =
      configuration.mode === "weekly"
        ? configuration.weeklySchedule.filter((day) => day.enabled)
        : configuration.manualAvailability;

    if (activeAvailabilities.length === 0) {
      return "bookingAvailabilityMaintenance.messages.availabilityRequired";
    }

    // The first problem found, said in words (2026-11-08).
    const allowDifferentPlaces = locations.length > 0 && locationsSameTime;
    for (const availability of activeAvailabilities) {
      if (availability.allDay) continue;
      const when =
        configuration.mode === "weekly"
          ? t(`bookingAvailabilityMaintenance.days.${availability.dayKey}.long`)
          : formatDateLong(availability.date, appLocale);
      if (availability.ranges.length === 0) {
        return tl("bookingAvailabilityMaintenance.messages.noRanges", "{{when}}: add at least one time range.", { when });
      }
      const problem = rangeProblem(availability.ranges, duration, allowDifferentPlaces);
      if (!problem) continue;
      const hours = (index) => {
        const range = availability.ranges[index];
        return `${formatTime(timeToMinutes(range.start), appLocale)}–${formatTime(timeToMinutes(range.end), appLocale)}`;
      };
      if (problem.kind === "short") {
        return tl(
          "bookingAvailabilityMaintenance.messages.rangeTooShort",
          "{{when}}, {{hours}}: the end must be after the start and leave room for at least one appointment of {{minutes}} minutes.",
          { when, hours: hours(problem.a), minutes: duration },
        );
      }
      const a = availability.ranges[problem.a];
      const b = availability.ranges[problem.b];
      const differentFixed =
        a.locationId && b.locationId && a.locationId !== b.locationId &&
        a.locationId !== CUSTOMER_CHOOSES && b.locationId !== CUSTOMER_CHOOSES;
      const values = { when, a: hours(problem.a), b: hours(problem.b) };
      if (differentFixed) {
        return tl(
          "bookingAvailabilityMaintenance.messages.overlapPlaces",
          "{{when}}: {{a}} and {{b}} are at the same time in two locations. Turn on \"We can attend in more than one location at the same time\" in Locations, or change the hours.",
          values,
        );
      }
      if (a.locationId === CUSTOMER_CHOOSES || b.locationId === CUSTOMER_CHOOSES) {
        return tl(
          "bookingAvailabilityMaintenance.messages.overlapChoice",
          "{{when}}: {{a}} and {{b}} overlap. A \"Customer chooses\" range can be in any location, so it can not share hours with another range.",
          values,
        );
      }
      return tl(
        "bookingAvailabilityMaintenance.messages.overlap",
        "{{when}}: {{a}} and {{b}} overlap. Change the hours.",
        values,
      );
    }
    return null;
  };

  const handleSave = async (event) => {
    event.preventDefault();
    const validationMessage = validateConfiguration();

    if (validationMessage) {
      notify(
        "warning",
        validationMessage.startsWith("bookingAvailabilityMaintenance.")
          ? t(validationMessage)
          : validationMessage,
      );
      return;
    }

    const companyId = readSelectedCompanyId();
    if (!companyId) {
      notify("error", t("bookingAvailabilityMaintenance.messages.missingCompany"));
      return;
    }

    const wasEditing = Boolean(configuration.id);
    // The schedule name is always the service name.
    const bundle = configurationToBundle(
      {
        ...configuration,
        name: selectedServiceName || configuration.name,
      },
      { today: TODAY_DATE_KEY },
    );

    setSaving(true);
    setMessage("");
    setExistingSchedule(null);
    setOverlaps([]);

    try {
      const response = await saveBookingService.saveBooking({
        companyId,
        booking: bundle,
      });

      // Reload the form with the fresh state returned by the backend.
      if (response?.result) {
        const loaded = bundleToConfiguration(response.result);
        setConfiguration(loaded);
        pristineRef.current = JSON.stringify(loaded);
      }
      // Keep the "Has schedule" labels up to date.
      loadScheduledServices();

      notify(
        "success",
        t(
          wasEditing
            ? "bookingAvailabilityMaintenance.messages.updated"
            : "bookingAvailabilityMaintenance.messages.created",
        ),
      );
    } catch (error) {
      console.error("Error saving booking:", error);
      // One schedule per service: offer to open the existing one instead of
      // showing a database error.
      const existingId = error?.response?.result?.existingBookingConfigId;
      if (error?.status === 409 && existingId) {
        setExistingSchedule({
          id: String(existingId),
          serviceName: selectedServiceName,
          reason: "save",
        });
        notify("warning", t("bookingAvailabilityMaintenance.messages.serviceHasSchedule"));
        return;
      }
      // One location at a time (2026-11-07): these hours are already in
      // another location.
      const clashes = overlapsFromError(error);
      if (clashes.length > 0) {
        setOverlaps(clashes);
        notify(
          "warning",
          tl(
            "bookingAvailabilityMaintenance.messages.locationOverlap",
            "Not saved: you attend in one location at a time and these hours are already in another location. Change the hours or the location, or turn on \"We can attend in more than one location at the same time\" in Locations.",
          ),
        );
        return;
      }
      // Two ranges in the same location (database rule): a clear sentence.
      const text = String(error?.message || "");
      if (/overlap with another range|exclusion constraint/i.test(text)) {
        notify(
          "warning",
          tl(
            "bookingAvailabilityMaintenance.messages.rangesOverlapSaved",
            "Not saved: two ranges of the same day are at the same time in the same location (or both without a location). Change the hours or choose a different location. Your saved hours were not changed.",
          ),
        );
        return;
      }
      notify("error", text || t("bookingAvailabilityMaintenance.messages.saveError"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="booking-availability-maintenance">
      <header className="booking-availability-maintenance__header">
        <div>
          <p className="booking-availability-maintenance__eyebrow">
            {t("bookingAvailabilityMaintenance.eyebrow")}
          </p>
          <h1>{t("bookingAvailabilityMaintenance.title")}</h1>
          <p>{t("bookingAvailabilityMaintenance.description")}</p>
        </div>

        <div className="booking-availability-maintenance__header-actions">
          <button
            className="booking-button booking-button--secondary"
            type="button"
            onClick={handleNew}
          >
            <FaPlus aria-hidden="true" />
            {t("bookingAvailabilityMaintenance.actions.new")}
          </button>
        </div>
      </header>

      <form onSubmit={handleSave}>
        {/* Step 1 (2026-11-08): the service first; the rest opens after it. */}
        <section className="booking-panel booking-panel--step-service">
          <div className="booking-panel__title">
            <span className="booking-step-number">1</span>
            <div>
              <h2>{tl("bookingAvailabilityMaintenance.steps.service", "Choose the service")}</h2>
              <p>
                {tl(
                  "bookingAvailabilityMaintenance.steps.serviceHelp",
                  "Start here: everything else in this schedule belongs to the service.",
                )}
              </p>
            </div>
          </div>

          <div className="booking-general-grid">
            {/* The service is the key: ONE schedule per service. Choosing a
                service opens its schedule when it has one. The schedule name
                is the service name (no separate name field). */}
            <div className="booking-field booking-field--wide">
              <label htmlFor="booking-service">
                {t("bookingAvailabilityMaintenance.fields.service.label")}
              </label>
              <div className="booking-service-search">
                <FaMagnifyingGlass className="booking-service-search__icon" aria-hidden="true" />
              <ServiceAutocomplete
                id="booking-service"
                t={t}
                companyId={readSelectedCompanyId()}
                value={{ id: configuration.serviceId, name: selectedServiceName }}
                onSelect={handleSelectService}
                scheduledIds={scheduledServiceIds}
                disabled={saving || searching}
                placeholder={t(
                  "bookingAvailabilityMaintenance.fields.service.searchPlaceholder",
                )}
              />
              </div>
              <small className="booking-field__help">
                {t("bookingAvailabilityMaintenance.fields.service.help")}
              </small>
            </div>

            {existingSchedule && (
              <div className="booking-existing-notice" role="alert">
                <p>
                  {t(
                    existingSchedule.reason === "save"
                      ? "bookingAvailabilityMaintenance.existing.saveConflict"
                      : "bookingAvailabilityMaintenance.existing.unsavedChanges",
                    { service: existingSchedule.serviceName },
                  )}
                </p>
                <div className="booking-existing-notice__actions">
                  <button
                    type="button"
                    className="booking-button booking-button--primary"
                    onClick={() =>
                      openExistingSchedule(
                        existingSchedule.id,
                        existingSchedule.serviceName,
                      )
                    }
                  >
                    {t("bookingAvailabilityMaintenance.existing.open")}
                  </button>
                  <button
                    type="button"
                    className="booking-button booking-button--secondary"
                    onClick={() => setExistingSchedule(null)}
                  >
                    {t("bookingAvailabilityMaintenance.existing.keep")}
                  </button>
                </div>
              </div>
            )}

          </div>
        </section>

        {/* Usable before the service is chosen (outside the locked part). */}
        {renderLocationsHint()}

        <fieldset
          className={`booking-steps${serviceChosen ? "" : " is-locked"}`}
          disabled={!serviceChosen}
          aria-disabled={!serviceChosen}
        >
          {!serviceChosen && (
            <p className="booking-locked-note" role="note">
              <FaLock aria-hidden="true" />
              {tl(
                "bookingAvailabilityMaintenance.steps.locked",
                "Choose a service first. Then the rest of the form opens.",
              )}
            </p>
          )}

        <section className="booking-panel">
          <div className="booking-panel__title">
            <span className="booking-step-number">2</span>
            <div>
              <h2>{t("bookingAvailabilityMaintenance.general.title")}</h2>
              <p>{t("bookingAvailabilityMaintenance.general.description")}</p>
            </div>
          </div>

          <div className="booking-general-grid">
            <div className="booking-field">
              <label htmlFor="booking-duration">
                {t("bookingAvailabilityMaintenance.fields.duration.label")}
              </label>
              <select
                id="booking-duration"
                name="durationMinutes"
                value={configuration.durationMinutes}
                onChange={updateConfigurationField}
              >
                {DURATION_OPTIONS.map((minutes) => (
                  <option key={minutes} value={minutes}>
                    {t("bookingAvailabilityMaintenance.fields.duration.option", {
                      count: minutes,
                    })}
                  </option>
                ))}
              </select>
            </div>

            <label className="booking-active-check">
              <input
                type="checkbox"
                name="active"
                checked={configuration.active}
                onChange={updateConfigurationField}
              />
              <span>
                <strong>
                  {t("bookingAvailabilityMaintenance.fields.active.label")}
                </strong>
                <small>
                  {t("bookingAvailabilityMaintenance.fields.active.help")}
                </small>
              </span>
            </label>

            <div className="booking-field">
              <label htmlFor="booking-general-appointments">
                {t("bookingAvailabilityMaintenance.fields.generalAppointments.label")}
              </label>
              <input
                id="booking-general-appointments"
                type="number"
                min="1"
                step="1"
                name="generalAppointments"
                value={configuration.generalAppointments}
                onChange={updateConfigurationField}
              />
              <small className="booking-field__help">
                {t("bookingAvailabilityMaintenance.fields.generalAppointments.help")}
              </small>
            </div>

            {configuration.mode === "weekly" && (
              <div className="booking-field">
                <label htmlFor="booking-lifespan">
                  {t("bookingAvailabilityMaintenance.fields.lifespan.label")}
                </label>
                <select
                  id="booking-lifespan"
                  name="lifespan"
                  value={configuration.lifespan}
                  onChange={updateConfigurationField}
                >
                  {LIFESPAN_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {t(
                        `bookingAvailabilityMaintenance.fields.lifespan.options.${option}`,
                      )}
                    </option>
                  ))}
                </select>
                <small className="booking-field__help">
                  {t("bookingAvailabilityMaintenance.fields.lifespan.help")}
                </small>
              </div>
            )}

            {configuration.mode === "weekly" && (
              <div className="booking-field booking-field--wide">
                <label>
                  {t("bookingAvailabilityMaintenance.fields.disableDates.label")}
                </label>
                <div className="booking-disable-dates">
                  <input
                    type="date"
                    name="disabledFrom"
                    value={configuration.disabledFrom}
                    onChange={updateConfigurationField}
                  />
                  <span className="booking-disable-dates__sep">
                    {t("bookingAvailabilityMaintenance.fields.disableDates.to")}
                  </span>
                  <input
                    type="date"
                    name="disabledTo"
                    value={configuration.disabledTo}
                    onChange={updateConfigurationField}
                  />
                </div>
                <small className="booking-field__help">
                  {t("bookingAvailabilityMaintenance.fields.disableDates.help")}
                </small>
              </div>
            )}
          </div>
        </section>

        <section className="booking-panel">
          <div className="booking-panel__title">
            <span className="booking-step-number">3</span>
            <div>
              <h2>{t("bookingAvailabilityMaintenance.mode.title")}</h2>
              <p>{t("bookingAvailabilityMaintenance.mode.description")}</p>
            </div>
          </div>

          <div className="booking-mode-selector">
            <button
              className={configuration.mode === "weekly" ? "is-active" : ""}
              type="button"
              onClick={() => changeMode("weekly")}
            >
              <FaCalendarWeek aria-hidden="true" />
              <span>
                <strong>
                  {t("bookingAvailabilityMaintenance.mode.weekly.title")}
                </strong>
                <small>
                  {t("bookingAvailabilityMaintenance.mode.weekly.description")}
                </small>
              </span>
            </button>
            <button
              className={configuration.mode === "manual" ? "is-active" : ""}
              type="button"
              onClick={() => changeMode("manual")}
            >
              <FaCalendarDay aria-hidden="true" />
              <span>
                <strong>
                  {t("bookingAvailabilityMaintenance.manual.title")}
                </strong>
                <small>
                  {t("bookingAvailabilityMaintenance.manual.description")}
                </small>
              </span>
            </button>
          </div>
          <p className="booking-mode-note">
            {deletesOnSave()
              ? tl(
                  "bookingAvailabilityMaintenance.modeSwitch.willDelete",
                  "When you save, the saved hours of \"{{other}}\" are deleted. Booked appointments are kept.",
                  { other: modeName(deletesOnSave()) },
                )
              : tl(
                  "bookingAvailabilityMaintenance.modeSwitch.onlyOne",
                  "Use one of the two options. Only the hours of the selected option are saved and offered.",
                )}
          </p>
        </section>

        {configuration.mode === "weekly" ? (
          <section className="booking-panel">
            <div className="booking-panel__heading">
              <div>
                <h2>{t("bookingAvailabilityMaintenance.weekly.title")}</h2>
                <p>{t("bookingAvailabilityMaintenance.weekly.description")}</p>
              </div>
              <span>
                {t("bookingAvailabilityMaintenance.weekly.enabledCount", {
                  count: enabledWeeklyDays.length,
                })}
              </span>
            </div>

            <div className="booking-weekly-list">
              {configuration.weeklySchedule.map((day) => (
                <article
                  className={`booking-weekly-day ${
                    day.enabled ? "is-enabled" : ""
                  }`}
                  key={day.dayKey}
                >
                  <div className="booking-weekly-day__identity">
                    <label className="booking-switch">
                      <input
                        type="checkbox"
                        checked={day.enabled}
                        onChange={(event) =>
                          updateWeeklyDay(
                            day.dayKey,
                            "enabled",
                            event.target.checked,
                          )
                        }
                      />
                      <span aria-hidden="true" />
                    </label>
                    <strong>
                      {t(
                        `bookingAvailabilityMaintenance.days.${day.dayKey}.long`,
                      )}
                    </strong>
                  </div>

                  {day.enabled ? (
                    <div className="booking-weekly-day__content">
                      <label className="booking-all-day-check">
                        <input
                          type="checkbox"
                          checked={day.allDay}
                          onChange={(event) =>
                            updateWeeklyDay(
                              day.dayKey,
                              "allDay",
                              event.target.checked,
                            )
                          }
                        />
                        <span>
                          {t("bookingAvailabilityMaintenance.weekly.allDay")}
                        </span>
                      </label>

                      {!day.allDay && (
                        <div className="booking-time-ranges">
                          {day.ranges.map((range) => (
                            <div className={rangeRowClass} key={range.id}>
                              <label>
                                <span>
                                  {t(
                                    "bookingAvailabilityMaintenance.fields.from",
                                  )}
                                </span>
                                <input
                                  type="time"
                                  value={range.start}
                                  onChange={(event) =>
                                    updateWeeklyRange(
                                      day.dayKey,
                                      range.id,
                                      "start",
                                      event.target.value,
                                    )
                                  }
                                />
                              </label>
                              <label>
                                <span>
                                  {t(
                                    "bookingAvailabilityMaintenance.fields.to",
                                  )}
                                </span>
                                <input
                                  type="time"
                                  value={range.end}
                                  onChange={(event) =>
                                    updateWeeklyRange(
                                      day.dayKey,
                                      range.id,
                                      "end",
                                      event.target.value,
                                    )
                                  }
                                />
                              </label>
                              <label>
                                <span>
                                  {t(
                                    "bookingAvailabilityMaintenance.fields.rangeAppointments",
                                  )}
                                </span>
                                <input
                                  type="number"
                                  min="0"
                                  step="1"
                                  placeholder={generalPlaceholder}
                                  value={range.appointments}
                                  onChange={(event) =>
                                    updateWeeklyRange(
                                      day.dayKey,
                                      range.id,
                                      "appointments",
                                      event.target.value,
                                    )
                                  }
                                />
                              </label>
                              {renderLocationSelect(
                                range.locationId,
                                (value) =>
                                  updateWeeklyRange(day.dayKey, range.id, "locationId", value),
                                `booking-location-${range.id}`,
                              )}
                              <button
                                className="booking-icon-button booking-icon-button--danger"
                                type="button"
                                onClick={() =>
                                  removeWeeklyRange(day.dayKey, range.id)
                                }
                                aria-label={t(
                                  "bookingAvailabilityMaintenance.actions.removeRange",
                                )}
                              >
                                <FaTrash aria-hidden="true" />
                              </button>
                            </div>
                          ))}
                          <button
                            className="booking-text-button"
                            type="button"
                            onClick={() => addWeeklyRange(day.dayKey)}
                          >
                            <FaPlus aria-hidden="true" />
                            {t(
                              "bookingAvailabilityMaintenance.actions.addRange",
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="booking-weekly-day__closed">
                      {t("bookingAvailabilityMaintenance.weekly.closed")}
                    </p>
                  )}
                </article>
              ))}
            </div>
          </section>
        ) : (
          <section className="booking-panel">
            <div className="booking-panel__heading">
              <div>
                <h2>{t("bookingAvailabilityMaintenance.manual.title")}</h2>
                <p>{t("bookingAvailabilityMaintenance.manual.description")}</p>
              </div>
              <span>
                {t("bookingAvailabilityMaintenance.manual.openCount", {
                  count: configuration.manualAvailability.filter(
                    (availability) => availability.date >= TODAY_DATE_KEY,
                  ).length,
                })}
              </span>
            </div>

            <div className="booking-manual-layout">
              <div className="booking-calendar">
                <div className="booking-calendar__header">
                  <button
                    type="button"
                    onClick={() => changeCalendarMonth(-1)}
                    aria-label={t(
                      "bookingAvailabilityMaintenance.actions.previousMonth",
                    )}
                  >
                    <FaChevronLeft aria-hidden="true" />
                  </button>
                  <strong>{monthLabel}</strong>
                  <button
                    type="button"
                    onClick={() => changeCalendarMonth(1)}
                    aria-label={t(
                      "bookingAvailabilityMaintenance.actions.nextMonth",
                    )}
                  >
                    <FaChevronRight aria-hidden="true" />
                  </button>
                </div>

                <div className="booking-calendar__weekdays">
                  {DAY_KEYS.map((dayKey) => (
                    <span key={dayKey}>
                      {t(
                        `bookingAvailabilityMaintenance.days.${dayKey}.short`,
                      )}
                    </span>
                  ))}
                </div>

                <div className="booking-calendar__days">
                  {calendarCells.map((cell) =>
                    cell.blank ? (
                      <span
                        className="booking-calendar__blank"
                        key={cell.key}
                      />
                    ) : (
                      <button
                        className={[
                          cell.key === selectedDate ? "is-selected" : "",
                          cell.key < TODAY_DATE_KEY ? "is-past" : "",
                          configuration.manualAvailability.some(
                            (availability) => availability.date === cell.key,
                          )
                            ? "has-availability"
                            : "",
                        ]
                          .filter(Boolean)
                          .join(" ")}
                        key={cell.key}
                        type="button"
                        disabled={cell.key < TODAY_DATE_KEY}
                        onClick={() => selectCalendarDate(cell.key)}
                      >
                        {cell.dayNumber}
                        <span aria-hidden="true" />
                      </button>
                    ),
                  )}
                </div>

                <div className="booking-calendar__legend">
                  <span aria-hidden="true" />
                  {t("bookingAvailabilityMaintenance.manual.legend")}
                </div>
              </div>

              <div className="booking-day-editor">
                <div className="booking-day-editor__header">
                  <div>
                    <small>
                      {t("bookingAvailabilityMaintenance.manual.selectedDate")}
                    </small>
                    <h3>{selectedDateLabel}</h3>
                  </div>
                  {selectedManualDay && (
                    <button
                      className="booking-text-button booking-text-button--danger"
                      type="button"
                      onClick={closeSelectedDate}
                    >
                      <FaTrash aria-hidden="true" />
                      {t("bookingAvailabilityMaintenance.actions.closeDay")}
                    </button>
                  )}
                </div>

                {!selectedManualDay ? (
                  <div className="booking-day-editor__empty">
                    <FaCalendarDay aria-hidden="true" />
                    <p>{t("bookingAvailabilityMaintenance.manual.dayClosed")}</p>
                    <button
                      className="booking-button booking-button--primary"
                      type="button"
                      onClick={openSelectedDate}
                    >
                      <FaPlus aria-hidden="true" />
                      {t("bookingAvailabilityMaintenance.actions.openDay")}
                    </button>
                  </div>
                ) : (
                  <div className="booking-day-editor__content">
                    <label className="booking-all-day-check">
                      <input
                        type="checkbox"
                        checked={selectedManualDay.allDay}
                        onChange={(event) =>
                          updateManualDay("allDay", event.target.checked)
                        }
                      />
                      <span>
                        {t("bookingAvailabilityMaintenance.manual.allDay")}
                      </span>
                    </label>

                    {selectedManualDay.allDay &&
                      selectedManualDay.ranges[0] &&
                      renderLocationSelect(
                        selectedManualDay.ranges[0].locationId,
                        (value) =>
                          updateManualRange(selectedManualDay.ranges[0].id, "locationId", value),
                        "booking-location-all-day",
                      )}

                    {!selectedManualDay.allDay && (
                      <div className="booking-time-ranges">
                        {selectedManualDay.ranges.map((range) => (
                          <div className={rangeRowClass} key={range.id}>
                            <label>
                              <span>
                                {t(
                                  "bookingAvailabilityMaintenance.fields.from",
                                )}
                              </span>
                              <input
                                type="time"
                                value={range.start}
                                onChange={(event) =>
                                  updateManualRange(
                                    range.id,
                                    "start",
                                    event.target.value,
                                  )
                                }
                              />
                            </label>
                            <label>
                              <span>
                                {t(
                                  "bookingAvailabilityMaintenance.fields.to",
                                )}
                              </span>
                              <input
                                type="time"
                                value={range.end}
                                onChange={(event) =>
                                  updateManualRange(
                                    range.id,
                                    "end",
                                    event.target.value,
                                  )
                                }
                              />
                            </label>
                            <label>
                              <span>
                                {t(
                                  "bookingAvailabilityMaintenance.fields.rangeAppointments",
                                )}
                              </span>
                              <input
                                type="number"
                                min="0"
                                step="1"
                                placeholder={generalPlaceholder}
                                value={range.appointments}
                                onChange={(event) =>
                                  updateManualRange(
                                    range.id,
                                    "appointments",
                                    event.target.value,
                                  )
                                }
                              />
                            </label>
                            {renderLocationSelect(
                              range.locationId,
                              (value) => updateManualRange(range.id, "locationId", value),
                              `booking-location-${range.id}`,
                            )}
                            <button
                              className="booking-icon-button booking-icon-button--danger"
                              type="button"
                              onClick={() => removeManualRange(range.id)}
                              aria-label={t(
                                "bookingAvailabilityMaintenance.actions.removeRange",
                              )}
                            >
                              <FaTrash aria-hidden="true" />
                            </button>
                          </div>
                        ))}
                        <button
                          className="booking-text-button"
                          type="button"
                          onClick={addManualRange}
                        >
                          <FaPlus aria-hidden="true" />
                          {t(
                            "bookingAvailabilityMaintenance.actions.addRange",
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

        <section className="booking-panel booking-preview">
          <div className="booking-panel__heading">
            <div>
              <h2>{t("bookingAvailabilityMaintenance.preview.title")}</h2>
              <p>{t("bookingAvailabilityMaintenance.preview.description")}</p>
            </div>
            <span>
              {t("bookingAvailabilityMaintenance.preview.count", {
                count: generatedSlots.length,
              })}
            </span>
          </div>

          {configuration.mode === "weekly" && enabledWeeklyDays.length > 0 && (
            <div className="booking-preview__day-select">
              <label htmlFor="booking-preview-day">
                {t("bookingAvailabilityMaintenance.preview.day")}
              </label>
              <select
                id="booking-preview-day"
                value={activePreviewDay?.dayKey || ""}
                onChange={(event) => setPreviewDayKey(event.target.value)}
              >
                {enabledWeeklyDays.map((day) => (
                  <option key={day.dayKey} value={day.dayKey}>
                    {t(
                      `bookingAvailabilityMaintenance.days.${day.dayKey}.long`,
                    )}
                  </option>
                ))}
              </select>
            </div>
          )}

          {generatedSlots.length === 0 ? (
            <div className="booking-slot-list__empty">
              {t("bookingAvailabilityMaintenance.preview.empty")}
            </div>
          ) : (
            <div className="booking-slot-groups">
              {previewGroups.map((group) => (
                <div className="booking-slot-group" key={group.key}>
                  {group.label && (
                    <strong className="booking-slot-group__name">
                      <FaLocationDot aria-hidden="true" />
                      {group.label}
                      <small>
                        {t("bookingAvailabilityMaintenance.preview.count", {
                          count: group.slots.length,
                        })}
                      </small>
                    </strong>
                  )}
                  <div className="booking-slot-list">
                    {group.slots.map((slot, index) => (
                      <span key={`${slot.start}-${slot.end}-${index}`}>
                        <FaClock aria-hidden="true" />
                        {t("bookingAvailabilityMaintenance.preview.slot", {
                          start: slot.start,
                          end: slot.end,
                        })}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {overlaps.length > 0 && (
          <div className="booking-location-overlaps" role="alert">
            <FaTriangleExclamation aria-hidden="true" />
            <div>
              <strong>
                {tl(
                  "bookingAvailabilityMaintenance.messages.overlapTitle",
                  "Hours already in another location",
                )}
              </strong>
              <ul>
                {overlaps.map((overlap, index) => (
                  <li key={index}>{overlapMessage(t, overlap)}</li>
                ))}
              </ul>
            </div>
          </div>
        )}

        </fieldset>

        <footer className="booking-availability-maintenance__footer">
          <p role="status">{message}</p>
          <button
            className="booking-button booking-button--primary"
            type="submit"
            disabled={!serviceChosen || saving}
          >
            <FaFloppyDisk aria-hidden="true" />
            {t(
              configuration.id
                ? "bookingAvailabilityMaintenance.actions.update"
                : "bookingAvailabilityMaintenance.actions.save",
            )}
          </button>
        </footer>
      </form>

      {pendingMode && (
        <div className="booking-confirm" role="presentation" onClick={() => setPendingMode(null)}>
          <div
            className="booking-confirm__dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="booking-confirm-title"
            onClick={(event) => event.stopPropagation()}
          >
            <h3 id="booking-confirm-title">
              {tl("bookingAvailabilityMaintenance.modeSwitch.title", "Change to {{mode}}?", {
                mode: modeName(pendingMode),
              })}
            </h3>
            <p>
              {tl(
                "bookingAvailabilityMaintenance.modeSwitch.body",
                "A schedule uses only one option. When you save, the saved hours of \"{{current}}\" are deleted and you start again with {{mode}}. Appointments already booked are kept.",
                { current: modeName(configuration.mode), mode: modeName(pendingMode) },
              )}
            </p>
            <div className="booking-confirm__actions">
              <button
                type="button"
                className="booking-button booking-button--secondary"
                onClick={() => setPendingMode(null)}
              >
                {tl("bookingAvailabilityMaintenance.modeSwitch.cancel", "Cancel")}
              </button>
              <button
                type="button"
                className="booking-button booking-button--primary"
                onClick={() => applyMode(pendingMode)}
              >
                {tl("bookingAvailabilityMaintenance.modeSwitch.confirm", "Change and delete on save")}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
