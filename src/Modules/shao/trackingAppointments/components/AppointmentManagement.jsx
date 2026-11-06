import { useEffect, useMemo, useState } from "react";
import {
  FaCalendarDay,
  FaCheck,
  FaCircleInfo,
  FaCalendarDays,
  FaChevronLeft,
  FaChevronRight,
  FaList,
  FaClock,
  FaEnvelope,
  FaFlagCheckered,
  FaMagnifyingGlass,
  FaPhone,
  FaRotateLeft,
  FaUser,
  FaXmark,
} from "react-icons/fa6";
import "./AppointmentManagement.scss";
import SearchAppointmentsService from "../../bookingSelfReservation/services/SearchAppointmentsService";
import AppointmentStatusService from "../services/AppointmentStatusService";

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
const appointmentStatusService = new AppointmentStatusService();

// Three real stages for this screen. PENDING/REJECTED are request stages and
// are handled in the booking-requests screen, so they are filtered out here.
const STATUS_FILTERS = ["all", "scheduled", "finished", "cancelled"];

const STATUS_LABEL = {
  scheduled: "Scheduled",
  finished: "Finished",
  cancelled: "Cancelled",
};

function mapAppointmentStatus(backendStatus) {
  const k = String(backendStatus || "").toUpperCase();
  if (k === "SCHEDULED" || k === "CONFIRMED") return "scheduled";
  if (k === "DONE") return "finished";
  if (k === "CANCELLED") return "cancelled";
  return ""; // PENDING / REJECTED -> not shown here
}

function mapAppointmentRow(row) {
  if (!row) return null;
  const status = mapAppointmentStatus(row.status);
  if (!status) return null; // drop request-stage rows
  const date = String(row.appointmentDate || "").slice(0, 10);
  const start = String(row.startHour || "").slice(0, 5);
  const end = String(row.endHour || "").slice(0, 5);
  const startAt = date ? `${date}T${start || "00:00"}:00` : null;
  return {
    id: row.appointmentId,
    customerName: row.customerName || "",
    phone: row.phone || "",
    email: row.email || "",
    serviceName: row.serviceId || "",
    appointmentDate: date,
    startHour: start,
    endHour: end,
    startAt,
    status,
    notes: row.comments || "",
  };
}

function formatDateTime(value, locale) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString(locale, {
    weekday: "short",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatTime(value, locale) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" });
}

/**
 * Appointment management: list real appointments, see details, and change the
 * status (finish / cancel). Default view = scheduled appointments whose start is
 * in the future, ordered by start time (soonest first).
 *
 * This is a NEW option; it reuses SearchAppointmentsService and the new
 * AppointmentStatusService, and does not modify existing screens.
 */
function ymd(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

// Build a 6-week matrix (weeks of 7 days) covering the given month.
function buildMonthMatrix(year, month) {
  const first = new Date(year, month, 1);
  const start = new Date(first);
  start.setDate(first.getDate() - first.getDay()); // back to Sunday
  const weeks = [];
  const cursor = new Date(start);
  for (let w = 0; w < 6; w += 1) {
    const week = [];
    for (let d = 0; d < 7; d += 1) {
      week.push({
        date: new Date(cursor),
        key: ymd(cursor),
        inMonth: cursor.getMonth() === month,
      });
      cursor.setDate(cursor.getDate() + 1);
    }
    weeks.push(week);
  }
  return weeks;
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function AppointmentManagement({ t, locale = "en" }) {
  const appLocale = locale.toLowerCase().startsWith("es") ? "es-CR" : "en-US";
  const tr = (key, fallback) =>
    typeof t === "function" ? t(key, { defaultValue: fallback }) : fallback;

  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [searchText, setSearchText] = useState("");
  const [statusFilter, setStatusFilter] = useState("scheduled"); // default
  const [onlyFuture, setOnlyFuture] = useState(true); // default
  const [selectedId, setSelectedId] = useState(null);
  const [savingId, setSavingId] = useState("");
  const [view, setView] = useState("list"); // "list" | "calendar"
  const todayYmd = ymd(new Date());
  const [calMonth, setCalMonth] = useState(() => {
    const n = new Date();
    return new Date(n.getFullYear(), n.getMonth(), 1);
  });
  const [selectedDay, setSelectedDay] = useState(todayYmd);
  const [dayModalOpen, setDayModalOpen] = useState(false); // day appointments popup

  const loadAppointments = async () => {
    const companyId = readSelectedCompanyId();
    if (!companyId) {
      setMessage(tr("appointmentManagement.noCompany", "No company is selected."));
      return;
    }
    setLoading(true);
    setMessage("");
    try {
      const rows = await searchAppointmentsService.getAppointments({
        companyId,
        filters: { limit: 500 },
      });
      const mapped = (Array.isArray(rows) ? rows : [])
        .map(mapAppointmentRow)
        .filter(Boolean)
        .sort((a, b) => String(a.startAt || "").localeCompare(String(b.startAt || "")));
      setAppointments(mapped);
    } catch (error) {
      console.error("Error loading appointments:", error);
      setMessage(error?.message || tr("appointmentManagement.loadError", "Could not load appointments."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAppointments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const now = Date.now();
  const visible = useMemo(() => {
    const term = searchText.trim().toLowerCase();
    return appointments.filter((a) => {
      if (statusFilter !== "all" && a.status !== statusFilter) return false;
      if (onlyFuture) {
        const t0 = a.startAt ? new Date(a.startAt).getTime() : 0;
        if (!t0 || t0 < now) return false;
      }
      if (term) {
        const hay = `${a.customerName} ${a.serviceName} ${a.phone} ${a.email}`.toLowerCase();
        if (!hay.includes(term)) return false;
      }
      return true;
    });
  }, [appointments, statusFilter, onlyFuture, searchText, now]);

  // Group ALL appointments by day (YYYY-MM-DD) for the calendar view.
  const appointmentsByDay = useMemo(() => {
    const map = {};
    for (const a of appointments) {
      if (!a.appointmentDate) continue;
      (map[a.appointmentDate] = map[a.appointmentDate] || []).push(a);
    }
    for (const key of Object.keys(map)) {
      map[key].sort((x, y) => String(x.startAt || "").localeCompare(String(y.startAt || "")));
    }
    return map;
  }, [appointments]);

  const weeks = useMemo(
    () => buildMonthMatrix(calMonth.getFullYear(), calMonth.getMonth()),
    [calMonth],
  );
  const monthLabel = calMonth.toLocaleDateString(appLocale, { month: "long", year: "numeric" });
  const selectedDayAppointments = appointmentsByDay[selectedDay] || [];
  const goPrevMonth = () => setCalMonth((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1));
  const goNextMonth = () => setCalMonth((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1));

  const selected = appointments.find((a) => a.id === selectedId) || null;
  const openDetails = (a) => setSelectedId(a.id);
  const closeDetails = () => setSelectedId(null);

  const openDay = (dayKey) => {
    setSelectedDay(dayKey);
    setDayModalOpen(true);
  };
  const closeDay = () => setDayModalOpen(false);

  const selectedDayLabel = new Date(`${selectedDay}T00:00:00`).toLocaleDateString(appLocale, {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  const resetFilters = () => {
    setSearchText("");
    setStatusFilter("scheduled");
    setOnlyFuture(true);
    setMessage("");
  };

  const changeStatus = async (appointment, nextStatus) => {
    const companyId = readSelectedCompanyId();
    if (!companyId || !appointment) return;
    setSavingId(appointment.id);
    setMessage("");
    try {
      const updated = await appointmentStatusService.changeStatus({
        companyId,
        appointmentId: appointment.id,
        status: nextStatus, // "DONE" | "CANCELLED"
      });
      const mapped = mapAppointmentStatus(updated?.status) || mapAppointmentStatus(nextStatus) || "scheduled";
      setAppointments((current) =>
        current.map((a) => (a.id === appointment.id ? { ...a, status: mapped } : a)),
      );
      setMessage(
        nextStatus === "DONE"
          ? tr("appointmentManagement.messages.finished", "Appointment marked as finished.")
          : tr("appointmentManagement.messages.cancelled", "Appointment cancelled."),
      );
    } catch (error) {
      console.error("Error changing appointment status:", error);
      setMessage(error?.message || tr("appointmentManagement.actionError", "The action could not be completed."));
    } finally {
      setSavingId("");
    }
  };

  return (
    <section className="appointment-management">
      <header className="appointment-management__header">
        <div>
          <p className="appointment-management__eyebrow">
            {tr("appointmentManagement.eyebrow", "SERVICE HUB · APPOINTMENTS")}
          </p>
          <h1>{tr("appointmentManagement.title", "Appointments")}</h1>
          <p>{tr("appointmentManagement.description", "Review upcoming appointments and finish or cancel each one.")}</p>
        </div>
        <div className="appointment-management__header-meta">
          <div className="appointment-view-toggle" role="tablist">
            <button
              type="button"
              className={view === "list" ? "is-active" : ""}
              onClick={() => setView("list")}
            >
              <FaList aria-hidden="true" />
              {tr("appointmentManagement.view.list", "List")}
            </button>
            <button
              type="button"
              className={view === "calendar" ? "is-active" : ""}
              onClick={() => setView("calendar")}
            >
              <FaCalendarDays aria-hidden="true" />
              {tr("appointmentManagement.view.calendar", "Calendar")}
            </button>
          </div>
        </div>
      </header>

      {message && <p className="appointment-management__message">{message}</p>}

      {view === "list" && (
        <>
      <div className="appointment-management__filters">
        <div className="appointment-filter appointment-filter--search">
          <FaMagnifyingGlass aria-hidden="true" />
          <input
            type="text"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            placeholder={tr("appointmentManagement.searchPlaceholder", "Search by customer, service, phone…")}
          />
        </div>

        <label className="appointment-filter">
          <span>{tr("appointmentManagement.filters.status", "Status")}</span>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            {STATUS_FILTERS.map((s) => (
              <option key={s} value={s}>
                {s === "all" ? tr("appointmentManagement.filters.all", "All") : (STATUS_LABEL[s] || s)}
              </option>
            ))}
          </select>
        </label>

        <label className="appointment-filter appointment-filter--check">
          <input type="checkbox" checked={onlyFuture} onChange={(e) => setOnlyFuture(e.target.checked)} />
          <span>{tr("appointmentManagement.filters.onlyFuture", "Upcoming only")}</span>
        </label>

        <button
          type="button"
          className="appointment-reset"
          onClick={resetFilters}
          title={tr("appointmentManagement.actions.resetFilters", "Reset filters")}
          aria-label={tr("appointmentManagement.actions.resetFilters", "Reset filters")}
        >
          <FaRotateLeft aria-hidden="true" />
        </button>
      </div>

      <div className="appointment-management__list">
        <div className="appointment-management__list-head">
          <h2>{tr("appointmentManagement.listTitle", "Appointments")}</h2>
          <span>
            {loading
              ? tr("appointmentManagement.loading", "Loading…")
              : `${visible.length} ${tr("appointmentManagement.count", "appointments")}`}
          </span>
        </div>

        <table className="appointment-table">
          <thead>
            <tr>
              <th>{tr("appointmentManagement.columns.time", "Appointment")}</th>
              <th>{tr("appointmentManagement.columns.customer", "Customer")}</th>
              <th>{tr("appointmentManagement.columns.service", "Service")}</th>
              <th>{tr("appointmentManagement.columns.status", "Status")}</th>
              <th>{tr("appointmentManagement.columns.actions", "Actions")}</th>
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 && !loading && (
              <tr>
                <td colSpan={5} className="appointment-table__empty">
                  {tr("appointmentManagement.empty", "No appointments match the current filters.")}
                </td>
              </tr>
            )}
            {visible.map((a) => {
              const saving = savingId === a.id;
              const isScheduled = a.status === "scheduled";
              return (
                <tr key={a.id}>
                  <td>
                    <strong>{formatTime(a.startAt, appLocale)}</strong>
                    <small>{formatDateTime(a.startAt, appLocale)}</small>
                  </td>
                  <td>{a.customerName || "—"}</td>
                  <td>{a.serviceName || "—"}</td>
                  <td>
                    <span className={`appointment-status appointment-status--${a.status}`}>
                      {STATUS_LABEL[a.status] || a.status}
                    </span>
                  </td>
                  <td>
                    <div className="appointment-actions">
                      <button type="button" className="appointment-button appointment-button--detail" onClick={() => openDetails(a)}>
                        <FaCircleInfo />
                        {tr("appointmentManagement.actions.details", "Details")}
                      </button>
                      {isScheduled && (
                        <>
                          <button
                            type="button"
                            className="appointment-button appointment-button--finish"
                            disabled={saving}
                            onClick={() => changeStatus(a, "DONE")}
                          >
                            <FaFlagCheckered />
                            {tr("appointmentManagement.actions.finish", "Finish")}
                          </button>
                          <button
                            type="button"
                            className="appointment-button appointment-button--cancel"
                            disabled={saving}
                            onClick={() => changeStatus(a, "CANCELLED")}
                          >
                            <FaXmark />
                            {tr("appointmentManagement.actions.cancel", "Cancel")}
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
        </>
      )}

      {view === "calendar" && (
        <div className="appointment-calendar">
          <div className="appointment-calendar__bar">
            <button type="button" className="appointment-cal-nav" onClick={goPrevMonth} aria-label={tr("appointmentManagement.calendar.prev", "Previous month")}>
              <FaChevronLeft aria-hidden="true" />
            </button>
            <strong className="appointment-calendar__label">{monthLabel}</strong>
            <button type="button" className="appointment-cal-nav" onClick={goNextMonth} aria-label={tr("appointmentManagement.calendar.next", "Next month")}>
              <FaChevronRight aria-hidden="true" />
            </button>
          </div>

          <div className="appointment-calendar__grid">
            {WEEKDAYS.map((wd) => (
              <div className="appointment-calendar__weekday" key={wd}>
                {tr(`appointmentManagement.weekdays.${wd.toLowerCase()}`, wd)}
              </div>
            ))}
            {weeks.map((week) =>
              week.map((cell) => {
                const dayItems = appointmentsByDay[cell.key] || [];
                const classes = [
                  "appointment-calendar__day",
                  cell.inMonth ? "" : "is-out",
                  cell.key === selectedDay ? "is-selected" : "",
                  cell.key === todayYmd ? "is-today" : "",
                ].filter(Boolean).join(" ");
                return (
                  <button
                    type="button"
                    key={cell.key}
                    className={classes}
                    onClick={() => openDay(cell.key)}
                  >
                    <span className="appointment-calendar__daynum">{cell.date.getDate()}</span>
                    <span className="appointment-calendar__chips">
                      {dayItems.slice(0, 3).map((a) => (
                        <span key={a.id} className={`appointment-chip appointment-chip--${a.status}`}>
                          {a.startHour || "--"}
                        </span>
                      ))}
                      {dayItems.length > 3 && (
                        <span className="appointment-chip appointment-chip--more">+{dayItems.length - 3}</span>
                      )}
                    </span>
                  </button>
                );
              }),
            )}
          </div>

        </div>
      )}

      {dayModalOpen && (
        <div className="appointment-modal appointment-modal--day" role="dialog" aria-modal="true">
          <button className="appointment-modal__backdrop" type="button" onClick={closeDay} aria-label={tr("appointmentManagement.actions.close", "Close")} />
          <aside className="appointment-day-panel">
            <header className="appointment-day-panel__header">
              <div>
                <p>{tr("appointmentManagement.calendar.dayEyebrow", "APPOINTMENTS")}</p>
                <h2>{selectedDayLabel}</h2>
              </div>
              <button type="button" onClick={closeDay} aria-label={tr("appointmentManagement.actions.close", "Close")}>
                <FaXmark />
              </button>
            </header>
            <div className="appointment-day-panel__body">
              {selectedDayAppointments.length === 0 ? (
                <p className="appointment-calendar__empty">
                  {tr("appointmentManagement.calendar.noDay", "No appointments on this day.")}
                </p>
              ) : (
                <ul className="appointment-day-items">
                  {selectedDayAppointments.map((a) => {
                    const saving = savingId === a.id;
                    const isScheduled = a.status === "scheduled";
                    return (
                      <li className="appointment-day-item" key={a.id}>
                        <div className="appointment-day-item__time">
                          <strong>{a.startHour || "--"}</strong>
                          {a.endHour ? <small>{a.endHour}</small> : null}
                        </div>
                        <div className="appointment-day-item__info">
                          <strong>{a.customerName || "\u2014"}</strong>
                          <small>{a.serviceName || ""}</small>
                        </div>
                        <span className={`appointment-status appointment-status--${a.status}`}>
                          {STATUS_LABEL[a.status] || a.status}
                        </span>
                        <div className="appointment-actions">
                          <button type="button" className="appointment-button appointment-button--detail" onClick={() => openDetails(a)}>
                            <FaCircleInfo />
                            {tr("appointmentManagement.actions.details", "Details")}
                          </button>
                          {isScheduled && (
                            <>
                              <button type="button" className="appointment-button appointment-button--finish" disabled={saving} onClick={() => changeStatus(a, "DONE")}>
                                <FaFlagCheckered />
                                {tr("appointmentManagement.actions.finish", "Finish")}
                              </button>
                              <button type="button" className="appointment-button appointment-button--cancel" disabled={saving} onClick={() => changeStatus(a, "CANCELLED")}>
                                <FaXmark />
                                {tr("appointmentManagement.actions.cancel", "Cancel")}
                              </button>
                            </>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </aside>
        </div>
      )}

      {selected && (
        <div className="appointment-modal" role="dialog" aria-modal="true">
          <button className="appointment-modal__backdrop" type="button" onClick={closeDetails} aria-label={tr("appointmentManagement.actions.close", "Close")} />
          <aside className="appointment-detail">
            <header className="appointment-detail__header">
              <div>
                <p>{tr("appointmentManagement.detail.eyebrow", "APPOINTMENT DETAILS")}</p>
                <h2>{selected.customerName || "—"}</h2>
              </div>
              <button type="button" onClick={closeDetails} aria-label={tr("appointmentManagement.actions.close", "Close")}>
                <FaXmark />
              </button>
            </header>

            <div className="appointment-detail__body">
              <div className="appointment-detail__highlight">
                <FaCalendarDay aria-hidden="true" />
                <div>
                  <small>{tr("appointmentManagement.detail.when", "Appointment")}</small>
                  <strong>{formatDateTime(selected.startAt, appLocale)}</strong>
                  <span>
                    {selected.startHour || "—"}
                    {selected.endHour ? ` – ${selected.endHour}` : ""}
                  </span>
                </div>
                <span className={`appointment-status appointment-status--${selected.status}`}>
                  {STATUS_LABEL[selected.status] || selected.status}
                </span>
              </div>

              <div className="appointment-detail__grid">
                <div className="appointment-detail__card">
                  <FaUser aria-hidden="true" />
                  <div>
                    <small>{tr("appointmentManagement.detail.customer", "Customer")}</small>
                    <strong>{selected.customerName || "—"}</strong>
                  </div>
                </div>
                <div className="appointment-detail__card">
                  <FaPhone aria-hidden="true" />
                  <div>
                    <small>{tr("appointmentManagement.detail.phone", "Phone")}</small>
                    {selected.phone ? <a href={`tel:${selected.phone}`}>{selected.phone}</a> : <strong className="is-empty">—</strong>}
                  </div>
                </div>
                <div className="appointment-detail__card">
                  <FaEnvelope aria-hidden="true" />
                  <div>
                    <small>{tr("appointmentManagement.detail.email", "Email")}</small>
                    {selected.email ? <a href={`mailto:${selected.email}`}>{selected.email}</a> : <strong className="is-empty">—</strong>}
                  </div>
                </div>
                <div className="appointment-detail__card">
                  <FaCalendarDay aria-hidden="true" />
                  <div>
                    <small>{tr("appointmentManagement.detail.service", "Service")}</small>
                    <strong>{selected.serviceName || "—"}</strong>
                  </div>
                </div>
              </div>

              <div className="appointment-detail__notes">
                <small>{tr("appointmentManagement.detail.notes", "Notes")}</small>
                <p>{selected.notes || tr("appointmentManagement.detail.noNotes", "No notes.")}</p>
              </div>
            </div>

            <footer className="appointment-detail__footer">
              <button className="appointment-button appointment-button--secondary" type="button" onClick={closeDetails}>
                {tr("appointmentManagement.actions.close", "Close")}
              </button>
              {selected.status === "scheduled" && (
                <>
                  <button
                    className="appointment-button appointment-button--cancel"
                    type="button"
                    disabled={savingId === selected.id}
                    onClick={() => changeStatus(selected, "CANCELLED")}
                  >
                    <FaXmark />
                    {tr("appointmentManagement.actions.cancel", "Cancel")}
                  </button>
                  <button
                    className="appointment-button appointment-button--finish"
                    type="button"
                    disabled={savingId === selected.id}
                    onClick={() => changeStatus(selected, "DONE")}
                  >
                    <FaCheck />
                    {tr("appointmentManagement.actions.finish", "Finish")}
                  </button>
                </>
              )}
            </footer>
          </aside>
        </div>
      )}
    </section>
  );
}