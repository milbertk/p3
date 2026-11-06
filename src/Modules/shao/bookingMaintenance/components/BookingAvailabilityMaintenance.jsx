import { useEffect, useMemo, useRef, useState } from "react";
import {
  FaCalendarDay,
  FaCalendarWeek,
  FaChevronLeft,
  FaChevronRight,
  FaClock,
  FaFloppyDisk,
  FaPlus,
  FaTrash,
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

const SELECTED_COMPANY_STORAGE_KEY = "selectedCompany";

const saveBookingService = new SaveBookingService();
const selectBookingService = new SelectBookingService();
const searchBookingsService = new SearchBookingsService();
const searchProductsService = new SearchProductsService();

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

const hasOverlappingRanges = (ranges) => {
  const ordered = ranges
    .map((range) => ({
      start: timeToMinutes(range.start),
      end: timeToMinutes(range.end),
    }))
    .sort((left, right) => left.start - right.start);

  return ordered.some(
    (range, index) =>
      range.start >= range.end ||
      (index > 0 && range.start < ordered[index - 1].end),
  );
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

  const changeMode = (mode) => {
    setConfiguration((current) => ({ ...current, mode }));
    setMessage("");
  };

  const handleNew = () => {
    const fresh = cloneConfiguration(EMPTY_CONFIGURATION);
    setConfiguration(fresh);
    pristineRef.current = JSON.stringify(fresh);
    setExistingSchedule(null);
    setMessage(t("bookingAvailabilityMaintenance.messages.newReady"));
  };

  const hasUnsavedChanges = () =>
    JSON.stringify(configuration) !== pristineRef.current;

  // Label of the selected service (the schedule name equals the service name).
  const selectedServiceName =
    serviceNames[configuration.serviceId] || configuration.name || "";

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

      if (loaded.manualAvailability.length > 0) {
        const nextSelectedDate = loaded.manualAvailability[0].date;
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
      setMessage(
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
    setMessage(
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
          ? { ...day, ranges: [...day.ranges, createRange("13:00", "17:00")] }
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
          ranges: [createRange("09:00", "12:00")],
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
                createRange("13:00", "17:00"),
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

    const invalidAvailability = activeAvailabilities.some((availability) => {
      if (availability.allDay) return false;
      if (availability.ranges.length === 0) return true;
      if (hasOverlappingRanges(availability.ranges)) return true;

      return availability.ranges.some(
        (range) =>
          timeToMinutes(range.end) - timeToMinutes(range.start) < duration,
      );
    });

    return invalidAvailability
      ? "bookingAvailabilityMaintenance.messages.invalidRanges"
      : null;
  };

  const handleSave = async (event) => {
    event.preventDefault();
    const validationMessage = validateConfiguration();

    if (validationMessage) {
      setMessage(t(validationMessage));
      return;
    }

    const companyId = readSelectedCompanyId();
    if (!companyId) {
      setMessage(
        t("bookingAvailabilityMaintenance.messages.missingCompany"),
      );
      return;
    }

    const wasEditing = Boolean(configuration.id);
    // The schedule name is always the service name.
    const bundle = configurationToBundle({
      ...configuration,
      name: selectedServiceName || configuration.name,
    });

    setSaving(true);
    setMessage("");
    setExistingSchedule(null);

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

      setMessage(
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
        setMessage(t("bookingAvailabilityMaintenance.messages.serviceHasSchedule"));
        return;
      }
      setMessage(
        error?.message ||
          t("bookingAvailabilityMaintenance.messages.saveError"),
      );
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
        <section className="booking-panel">
          <div className="booking-panel__title">
            <span>
              <FaClock aria-hidden="true" />
            </span>
            <div>
              <h2>{t("bookingAvailabilityMaintenance.general.title")}</h2>
              <p>{t("bookingAvailabilityMaintenance.general.description")}</p>
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
            <span>
              <FaCalendarWeek aria-hidden="true" />
            </span>
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
                            <div className="booking-time-range" key={range.id}>
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
                                  placeholder={t(
                                    "bookingAvailabilityMaintenance.fields.usesGeneral",
                                  )}
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
                  count: configuration.manualAvailability.length,
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

                    {!selectedManualDay.allDay && (
                      <div className="booking-time-ranges">
                        {selectedManualDay.ranges.map((range) => (
                          <div className="booking-time-range" key={range.id}>
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
                                placeholder={t(
                                  "bookingAvailabilityMaintenance.fields.usesGeneral",
                                )}
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

          <div className="booking-slot-list">
            {generatedSlots.length === 0 ? (
              <div className="booking-slot-list__empty">
                {t("bookingAvailabilityMaintenance.preview.empty")}
              </div>
            ) : (
              generatedSlots.map((slot, index) => (
                <span key={`${slot.start}-${slot.end}-${index}`}>
                  <FaClock aria-hidden="true" />
                  {t("bookingAvailabilityMaintenance.preview.slot", {
                    start: slot.start,
                    end: slot.end,
                  })}
                </span>
              ))
            )}
          </div>
        </section>

        <footer className="booking-availability-maintenance__footer">
          <p role="status">{message}</p>
          <button
            className="booking-button booking-button--primary"
            type="submit"
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
    </section>
  );
}
