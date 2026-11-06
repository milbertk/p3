import { useEffect, useMemo, useState } from "react";
import {
  FaCalendarDay,
  FaCheck,
  FaClock,
  FaEnvelope,
  FaEye,
  FaFilter,
  FaMagnifyingGlass,
  FaPhone,
  FaRotateLeft,
  FaUser,
  FaWhatsapp,
  FaXmark,
} from "react-icons/fa6";
import "./BookingRequestManagement.scss";

import AppointmentRequestActionsService from "../../bookingRequestManagment/services/AppointmentRequestActionsService"
import SelectAppointmentService from  "../../bookingSelfReservation/services/SelectAppointmentService"
import SearchAppointmentsService from "../../bookingSelfReservation/services/SearchAppointmentsService"

const SELECTED_COMPANY_STORAGE_KEY = "selectedCompany";

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

const searchAppointmentsService = new SearchAppointmentsService();
const appointmentActionsService = new AppointmentRequestActionsService();

// Map a backend appointment status to this screen's vocabulary.
function mapAppointmentStatus(backendStatus) {
  const k = String(backendStatus || "").toUpperCase();
  if (k === "PENDING") return "requested";
  if (k === "SCHEDULED" || k === "CONFIRMED") return "accepted";
  if (k === "REJECTED" || k === "CANCELLED") return "rejected";
  if (k === "DONE") return "finished";
  return "requested";
}

// Map a backend appointment row to the shape this screen expects.
function mapAppointmentRow(row) {
  if (!row) return null;
  const date = String(row.appointmentDate || "").slice(0, 10);
  const start = String(row.startHour || "").slice(0, 5);
  const appointmentAt = date ? `${date}T${start || "00:00"}:00` : null;
  return {
    id: row.appointmentId,
    customerName: row.customerName || "",
    phone: row.phone || "",
    email: row.email || "",
    preferredContact: "",
    serviceKey: row.serviceId || "",
    serviceName: row.serviceId || "",
    appointmentAt,
    requestedAt: row.createdAt || null,
    status: mapAppointmentStatus(row.status),
    notes: row.comments || "",
  };
}

const STATUS_FILTERS = [
  "all",
  "active",
  "requested",
  "accepted",
  "rejected",
  "finished",
];

const PERIOD_FILTERS = ["today", "week", "month", "all", "custom"];



const startOfDay = (date) => {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
};

const endOfDay = (date) => {
  const result = new Date(date);
  result.setHours(23, 59, 59, 999);
  return result;
};

const parseDateInput = (value, end = false) => {
  if (!value) return null;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return end ? endOfDay(date) : startOfDay(date);
};

const formatDateInput = (date) =>
  [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");

const getPeriodRange = (period, customFrom, customTo) => {
  const today = new Date();

  if (period === "all") return { start: null, end: null };
  if (period === "custom") {
    return {
      start: parseDateInput(customFrom),
      end: parseDateInput(customTo, true),
    };
  }

  if (period === "today") {
    return { start: startOfDay(today), end: endOfDay(today) };
  }

  if (period === "week") {
    const day = today.getDay();
    const mondayOffset = day === 0 ? -6 : 1 - day;
    const start = startOfDay(today);
    start.setDate(start.getDate() + mondayOffset);
    const end = endOfDay(start);
    end.setDate(end.getDate() + 6);
    return { start, end };
  }

  return {
    start: new Date(today.getFullYear(), today.getMonth(), 1),
    end: endOfDay(new Date(today.getFullYear(), today.getMonth() + 1, 0)),
  };
};

const matchesStatusFilter = (status, filter) => {
  if (filter === "all") return true;
  if (filter === "active") {
    return status === "requested" || status === "accepted";
  }
  return status === filter;
};

const formatAppointmentDate = (value, locale) =>
  new Intl.DateTimeFormat(locale, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));

const formatAppointmentTime = (value, locale) =>
  new Intl.DateTimeFormat(locale, {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));

const formatFullDateTime = (value, locale) =>
  new Intl.DateTimeFormat(locale, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));

const getContactIcon = (contact) => {
  if (contact === "whatsapp") return <FaWhatsapp aria-hidden="true" />;
  if (contact === "email") return <FaEnvelope aria-hidden="true" />;
  return <FaPhone aria-hidden="true" />;
};

/**
 * Operational list for accepting, rejecting, and finishing booking requests.
 *
 * Loads real appointment requests from the backend, or provide
 * onStatusChange to persist every status transition.
 */
export default function BookingRequestManagement({
  t,
  locale = "en",
  onStatusChange,
  onOpen,
}) {
  const appLocale = locale.toLowerCase().startsWith("es") ? "es-CR" : "en-US";
  const today = new Date();

  const [requests, setRequests] = useState([]);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [statusFilter, setStatusFilter] = useState("requested");
  const [periodFilter, setPeriodFilter] = useState("all");
  const [customFrom, setCustomFrom] = useState(formatDateInput(today));
  const [customTo, setCustomTo] = useState(formatDateInput(today));
  const [selectedRequestId, setSelectedRequestId] = useState(null);
  const [message, setMessage] = useState("");

  // Load the real requests (all statuses so every filter works).
  const loadRequests = async () => {
    const companyId = readSelectedCompanyId();
    if (!companyId) {
      setMessage("No company is selected.");
      return;
    }
    setLoadingRequests(true);
    try {
      const rows = await searchAppointmentsService.getAppointments({
        companyId,
        filters: { limit: 500 },
      });
      setRequests((Array.isArray(rows) ? rows : []).map(mapAppointmentRow).filter(Boolean));
    } catch (error) {
      console.error("Error loading booking requests:", error);
      setMessage(error?.message || "Could not load the requests.");
    } finally {
      setLoadingRequests(false);
    }
  };

  useEffect(() => {
    loadRequests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredRequests = useMemo(() => {
    const term = searchText.trim().toLowerCase();
    const { start, end } = getPeriodRange(
      periodFilter,
      customFrom,
      customTo,
    );

    return requests
      .filter((request) => matchesStatusFilter(request.status, statusFilter))
      .filter((request) => {
        const appointment = new Date(request.appointmentAt);
        if (start && appointment < start) return false;
        if (end && appointment > end) return false;
        return true;
      })
      .filter((request) => {
        if (!term) return true;
        const serviceName = (request.serviceName || request.serviceKey);
        return [
          request.customerName,
          request.phone,
          request.email,
          serviceName,
        ]
          .join(" ")
          .toLowerCase()
          .includes(term);
      })
      .sort(
        (left, right) =>
          new Date(left.appointmentAt) - new Date(right.appointmentAt),
      );
  }, [
    customFrom,
    customTo,
    periodFilter,
    requests,
    searchText,
    statusFilter,
    t,
  ]);

  const selectedRequest = requests.find(
    (request) => request.id === selectedRequestId,
  );

  const openDetails = (request) => {
    setSelectedRequestId(request.id);
    setMessage("");
    if (onOpen) onOpen(request);
  };

  const closeDetails = () => {
    setSelectedRequestId(null);
  };

  const resetFilters = () => {
    setSearchText("");
    setStatusFilter("requested");
    setPeriodFilter("all");
    setCustomFrom(formatDateInput(new Date()));
    setCustomTo(formatDateInput(new Date()));
    setMessage(t("bookingRequestManagement.messages.filtersReset"));
  };

  const changeRequestStatus = async (nextStatus) => {
    if (!selectedRequest) return;
    const companyId = readSelectedCompanyId();
    const transition = {
      bookingRequestId: selectedRequest.id,
      previousStatus: selectedRequest.status,
      nextStatus,
      changedAt: new Date().toISOString(),
    };

    try {
      // Persist accept/reject on the backend (approve -> SCHEDULED, reject -> REJECTED).
      if (nextStatus === "accepted") {
        await appointmentActionsService.approve({ companyId, appointmentId: selectedRequest.id });
      } else if (nextStatus === "rejected") {
        await appointmentActionsService.reject({ companyId, appointmentId: selectedRequest.id });
      }
      // NOTE: "finished" has no backend endpoint yet; it updates locally only.

      if (onStatusChange) await onStatusChange(transition);

      setRequests((current) =>
        current.map((request) =>
          request.id === selectedRequest.id
            ? { ...request, status: nextStatus, statusChangedAt: transition.changedAt }
            : request,
        ),
      );
      setMessage(t(`bookingRequestManagement.messages.statusChanged.${nextStatus}`));
    } catch (error) {
      console.error("Error changing request status:", error);
      setMessage(error?.message || "The action could not be completed.");
    }
  };

  return (
    <section className="booking-request-management">
      <header className="booking-request-management__header">
        <div>
          <p className="booking-request-management__eyebrow">
            {t("bookingRequestManagement.eyebrow")}
          </p>
          <h1>{t("bookingRequestManagement.title")}</h1>
          <p>{t("bookingRequestManagement.description")}</p>
        </div>

        <div className="booking-request-management__header-meta">
          <strong>
            <FaClock aria-hidden="true" />
            {t("bookingRequestManagement.sortedByTime")}
          </strong>
        </div>
      </header>

      <section className="booking-request-filters">
        <div className="booking-request-filters__search">
          <FaMagnifyingGlass aria-hidden="true" />
          <input
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
            placeholder={t("bookingRequestManagement.filters.search")}
            aria-label={t("bookingRequestManagement.filters.searchLabel")}
          />
        </div>

        <div className="booking-request-filters__right">
          <label>
            <span>{t("bookingRequestManagement.filters.period")}</span>
            <select
              value={periodFilter}
              onChange={(event) => setPeriodFilter(event.target.value)}
            >
              {PERIOD_FILTERS.map((period) => (
                <option key={period} value={period}>
                  {t(`bookingRequestManagement.periods.${period}`)}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span>{t("bookingRequestManagement.filters.status")}</span>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
            >
              {STATUS_FILTERS.map((status) => (
                <option key={status} value={status}>
                  {t(`bookingRequestManagement.statusFilters.${status}`)}
                </option>
              ))}
            </select>
          </label>

          <button
            className="booking-request-icon-button"
            type="button"
            onClick={resetFilters}
            aria-label={t("bookingRequestManagement.actions.resetFilters")}
            title={t("bookingRequestManagement.actions.resetFilters")}
          >
            <FaRotateLeft aria-hidden="true" />
          </button>
        </div>

        {periodFilter === "custom" && (
          <div className="booking-request-filters__custom">
            <FaFilter aria-hidden="true" />
            <label>
              <span>{t("bookingRequestManagement.filters.from")}</span>
              <input
                type="date"
                value={customFrom}
                onChange={(event) => setCustomFrom(event.target.value)}
              />
            </label>
            <label>
              <span>{t("bookingRequestManagement.filters.to")}</span>
              <input
                type="date"
                value={customTo}
                min={customFrom}
                onChange={(event) => setCustomTo(event.target.value)}
              />
            </label>
          </div>
        )}
      </section>

      <div className="booking-request-list-heading">
        <div>
          <h2>{t("bookingRequestManagement.list.title")}</h2>
          <p>{t("bookingRequestManagement.list.doubleClickHelp")}</p>
        </div>
        <span>
          {t("bookingRequestManagement.list.count", {
            count: filteredRequests.length,
          })}
        </span>
      </div>

      <div className="booking-request-table-wrap">
        <table className="booking-request-table">
          <thead>
            <tr>
              <th>{t("bookingRequestManagement.columns.appointment")}</th>
              <th>{t("bookingRequestManagement.columns.customer")}</th>
              <th>{t("bookingRequestManagement.columns.contact")}</th>
              <th>{t("bookingRequestManagement.columns.service")}</th>
              <th>{t("bookingRequestManagement.columns.status")}</th>
              <th>
                <span className="sr-only">
                  {t("bookingRequestManagement.columns.actions")}
                </span>
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredRequests.map((request) => (
              <tr
                key={request.id}
                tabIndex={0}
                onDoubleClick={() => openDetails(request)}
                onKeyDown={(event) =>
                  event.key === "Enter" && openDetails(request)
                }
              >
                <td>
                  <div className="booking-request-table__appointment">
                    <strong>
                      {formatAppointmentTime(request.appointmentAt, appLocale)}
                    </strong>
                    <small>
                      {formatAppointmentDate(request.appointmentAt, appLocale)}
                    </small>
                  </div>
                </td>
                <td>
                  <div className="booking-request-table__customer">
                    <span>{request.customerName.slice(0, 1)}</span>
                    <strong>{request.customerName}</strong>
                  </div>
                </td>
                <td>
                  <div className="booking-request-table__contact">
                    {getContactIcon(request.preferredContact)}
                    <span>
                      <strong>
                        {t(
                          `bookingRequestManagement.contacts.${request.preferredContact}`,
                        )}
                      </strong>
                      <small>{request.phone}</small>
                    </span>
                  </div>
                </td>
                <td>
                  {request.serviceName || request.serviceKey}
                </td>
                <td>
                  <span
                    className={`booking-status booking-status--${request.status}`}
                  >
                    {t(`bookingRequestManagement.statuses.${request.status}`)}
                  </span>
                </td>
                <td>
                  <button
                    className="booking-request-details-button"
                    type="button"
                    onClick={() => openDetails(request)}
                    aria-label={t(
                      "bookingRequestManagement.actions.viewDetailsFor",
                      { name: request.customerName },
                    )}
                  >
                    <FaEye aria-hidden="true" />
                    <span>
                      {t("bookingRequestManagement.actions.viewDetails")}
                    </span>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredRequests.length === 0 && (
          <div className="booking-request-list__empty">
            <FaCalendarDay aria-hidden="true" />
            <h3>{t("bookingRequestManagement.empty.title")}</h3>
            <p>{t("bookingRequestManagement.empty.description")}</p>
          </div>
        )}
      </div>

      <footer className="booking-request-management__footer">
        <p role="status">{message}</p>
        <span>
          {t("bookingRequestManagement.footer.defaultFilters")}
        </span>
      </footer>

      {selectedRequest && (
        <div
          className="booking-request-dialog-backdrop"
          role="presentation"
          onMouseDown={(event) =>
            event.target === event.currentTarget && closeDetails()
          }
        >
          <section
            className="booking-request-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="booking-request-dialog-title"
          >
            <header className="booking-request-dialog__header">
              <div>
                <p>{t("bookingRequestManagement.details.eyebrow")}</p>
                <h2 id="booking-request-dialog-title">
                  {selectedRequest.customerName}
                </h2>
              </div>
              <button
                type="button"
                onClick={closeDetails}
                aria-label={t("bookingRequestManagement.actions.close")}
              >
                <FaXmark aria-hidden="true" />
              </button>
            </header>

            <div className="booking-request-dialog__summary">
              <div>
                <FaCalendarDay aria-hidden="true" />
                <span>
                  <small>
                    {t("bookingRequestManagement.details.appointment")}
                  </small>
                  <strong>
                    {formatFullDateTime(
                      selectedRequest.appointmentAt,
                      appLocale,
                    )}
                  </strong>
                </span>
              </div>
              <span
                className={`booking-status booking-status--${selectedRequest.status}`}
              >
                {t(
                  `bookingRequestManagement.statuses.${selectedRequest.status}`,
                )}
              </span>
            </div>

            <div className="booking-request-dialog__details">
              <div>
                <span>
                  <FaUser aria-hidden="true" />
                </span>
                <section>
                  <small>{t("bookingRequestManagement.details.customer")}</small>
                  <strong>{selectedRequest.customerName}</strong>
                </section>
              </div>
              <div>
                <span>
                  {getContactIcon(selectedRequest.preferredContact)}
                </span>
                <section>
                  <small>
                    {t("bookingRequestManagement.details.preferredContact")}
                  </small>
                  <strong>
                    {t(
                      `bookingRequestManagement.contacts.${selectedRequest.preferredContact}`,
                    )}
                  </strong>
                </section>
              </div>
              <div>
                <span>
                  <FaPhone aria-hidden="true" />
                </span>
                <section>
                  <small>{t("bookingRequestManagement.details.phone")}</small>
                  <strong>{selectedRequest.phone}</strong>
                </section>
              </div>
              <div>
                <span>
                  <FaEnvelope aria-hidden="true" />
                </span>
                <section>
                  <small>{t("bookingRequestManagement.details.email")}</small>
                  <strong>
                    {selectedRequest.email || (
                      <span className="no-email-badge">{t("bookingRequestManagement.details.noEmail")}</span>
                    )}
                  </strong>
                </section>
              </div>
            </div>

            <div className="booking-request-dialog__service">
              <div>
                <small>{t("bookingRequestManagement.details.service")}</small>
                <strong>
                  {selectedRequest.serviceName || selectedRequest.serviceKey}
                </strong>
              </div>
              <div>
                <small>{t("bookingRequestManagement.details.requestedAt")}</small>
                <strong>
                  {formatFullDateTime(selectedRequest.requestedAt, appLocale)}
                </strong>
              </div>
            </div>

            <div className="booking-request-dialog__notes">
              <small>{t("bookingRequestManagement.details.notes")}</small>
              <p>
                {selectedRequest.notes ||
                  t("bookingRequestManagement.details.noNotes")}
              </p>
            </div>

            <footer className="booking-request-dialog__footer">
              <button
                className="booking-request-action booking-request-action--secondary"
                type="button"
                onClick={closeDetails}
              >
                {t("bookingRequestManagement.actions.close")}
              </button>

              <div>
                {selectedRequest.status === "requested" && (
                  <button
                    className="booking-request-action booking-request-action--reject"
                    type="button"
                    onClick={() => changeRequestStatus("rejected")}
                  >
                    <FaXmark aria-hidden="true" />
                    {t("bookingRequestManagement.actions.reject")}
                  </button>
                )}

                {selectedRequest.status === "requested" && (
                  <button
                    className="booking-request-action booking-request-action--accept"
                    type="button"
                    onClick={() => changeRequestStatus("accepted")}
                  >
                    <FaCheck aria-hidden="true" />
                    {t("bookingRequestManagement.actions.accept")}
                  </button>
                )}

              </div>
            </footer>
          </section>
        </div>
      )}
    </section>
  );
}