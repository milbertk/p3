import { useEffect, useMemo, useState } from "react";
import {
  FaCalendarCheck,
  FaCalendarDay,
  FaClock,
  FaCircleCheck,
  FaCircleExclamation,
  FaTriangleExclamation,
  FaFloppyDisk,
  FaPen,
  FaTrash,
  FaUser,
  FaPhone,
  FaEnvelope,
  FaLink,
  FaLocationDot,
} from "react-icons/fa6";
import "./BookingReservationForm.scss";

import SaveAppointmentService from "../services/SaveAppointmentService";
import SearchAppointmentsService from "../services/SearchAppointmentsService";
import SelectAppointmentService from "../services/SelectAppointmentService";
import DeleteAppointmentService from "../services/DeleteAppointmentService";
import SearchProductsService from "../../products/services/SearchProductsService";
import SearchCustomersService from "../../customers/services/SearchCustomersService";
import LocationsService from "../../locations/services/LocationsService";

const SELECTED_COMPANY_STORAGE_KEY = "selectedCompany";

const saveAppointmentService = new SaveAppointmentService();
const searchAppointmentsService = new SearchAppointmentsService();
const selectAppointmentService = new SelectAppointmentService();
const deleteAppointmentService = new DeleteAppointmentService();
const searchProductsService = new SearchProductsService();
const searchCustomersService = new SearchCustomersService();
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

const STATUS_OPTIONS = [
  { value: "SCHEDULED", label: "Scheduled" },
  { value: "CONFIRMED", label: "Confirmed" },
  { value: "CANCELLED", label: "Cancelled" },
  { value: "DONE", label: "Done" },
];

const EMPTY_APPOINTMENT = {
  // Background / identifiers (mostly automatic).
  appointmentId: "", // unique identifier (set on save)
  registeredAt: "", // date registered (set on save)
  registeredBy: "provider-user", // user who registered (mock: the provider)
  status: "SCHEDULED",

  // Service.
  serviceId: "",

  // Customer: registered (from DB) or a typed name.
  useRegisteredCustomer: true,
  customerId: "",
  customerName: "",

  // Contact.
  phone: "",
  email: "",
  socialLink: "",

  // Date + time range.
  date: "",
  startHour: "",
  endHour: "",

  // Location (2026-11-07): optional, "" = none.
  locationId: "",

  // Notes.
  comments: "",
};

export default function BookingReservationForm({ t, onCancel = () => {} }) {
  const [appointment, setAppointment] = useState(EMPTY_APPOINTMENT);
  const [customerSearch, setCustomerSearch] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [conflictWarning, setConflictWarning] = useState("");
  const [appointmentSearch, setAppointmentSearch] = useState("");
  const [appointmentResults, setAppointmentResults] = useState([]);

  // Real-data state.
  const [serviceSearch, setServiceSearch] = useState("");
  const [serviceResults, setServiceResults] = useState([]);
  const [selectedServiceName, setSelectedServiceName] = useState("");
  const [customerResults, setCustomerResults] = useState([]);
  const [saving, setSaving] = useState(false);
  const [searching, setSearching] = useState(false);
  // Locations of the company (2026-11-07); the field shows only when the
  // company uses locations ("We use locations", 2026-11-08) and has some.
  const [locations, setLocations] = useState([]);
  const [locationsOn, setLocationsOn] = useState(false);

  const tr = useMemo(() => {
    return (key, fallback) => {
      try {
        if (typeof t !== "function") return fallback;
        const value = t(key);
        return !value || value === key ? fallback : value;
      } catch {
        return fallback;
      }
    };
  }, [t]);

  const isEditing = Boolean(appointment.appointmentId);

  useEffect(() => {
    let active = true;
    const companyId = readSelectedCompanyId();
    if (!companyId) return undefined;
    locationsService
      .forForms({ companyId })
      .then(({ enabled, locations: list }) => {
        if (!active) return;
        setLocationsOn(enabled);
        setLocations(enabled ? list : []);
      })
      .catch(() => {
        // Without the list the form works as before (no location field).
        // The saved location of a loaded appointment is still sent back.
      });
    return () => {
      active = false;
    };
  }, []);

  // Active locations + the one of the loaded appointment (even if disabled).
  const locationOptions = locations.filter(
    (location) => location.active || location.locationId === appointment.locationId,
  );

  const serviceName = selectedServiceName;

  // Live registered-customer search (backend, debounced).
  useEffect(() => {
    const term = customerSearch.trim();
    if (!term || !appointment.useRegisteredCustomer || appointment.customerId) {
      setCustomerResults([]);
      return undefined;
    }
    const companyId = readSelectedCompanyId();
    if (!companyId) return undefined;

    let active = true;
    const timer = setTimeout(() => {
      searchCustomersService
        .getCustomers({ companyId, filters: { term } })
        .then((rows) => {
          if (!active) return;
          setCustomerResults(
            (Array.isArray(rows) ? rows : [])
              .map((row) => ({
                id: String(row.customerInternalId || row.customer_internal_id || ""),
                name: String(row.name || ""),
                phone: String(row.cellphone || row.phone || ""),
                email: String(row.email || ""),
                social: String(row.socialNetworkLink || row.social_network_link || ""),
              }))
              .slice(0, 6),
          );
        })
        .catch(() => {
          if (active) setCustomerResults([]);
        });
    }, 300);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [customerSearch, appointment.useRegisteredCustomer, appointment.customerId]);

  // Live service search (products marked as SERVICE, backend, debounced).
  useEffect(() => {
    const term = serviceSearch.trim();
    if (!term || appointment.serviceId) {
      setServiceResults([]);
      return undefined;
    }
    const companyId = readSelectedCompanyId();
    if (!companyId) return undefined;

    let active = true;
    const timer = setTimeout(() => {
      searchProductsService
        .getProducts({ companyId, filters: { term, productType: "SERVICE" } })
        .then((rows) => {
          if (!active) return;
          setServiceResults(
            (Array.isArray(rows) ? rows : [])
              .map((row) => ({
                id: String(row.productInternalId || row.product_internal_id || ""),
                name: String(row.name || ""),
              }))
              .filter((row) => row.id)
              .slice(0, 6),
          );
        })
        .catch(() => {
          if (active) setServiceResults([]);
        });
    }, 300);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [serviceSearch, appointment.serviceId]);

  const updateField = (event) => {
    const { name, value } = event.target;
    setMessage("");
    setError("");
    setAppointment((current) => ({ ...current, [name]: value }));
  };

  const toggleRegisteredCustomer = (event) => {
    const useRegistered = event.target.checked;
    setMessage("");
    setError("");
    setCustomerSearch("");
    setAppointment((current) => ({
      ...current,
      useRegisteredCustomer: useRegistered,
      // Clear the other mode's data.
      customerId: "",
      customerName: "",
      phone: "",
      email: "",
      socialLink: "",
    }));
  };

  const selectCustomer = (customer) => {
    setMessage("");
    setError("");
    setCustomerSearch(customer.name);
    setAppointment((current) => ({
      ...current,
      customerId: customer.id,
      customerName: customer.name,
      phone: customer.phone || "",
      email: customer.email || "",
      socialLink: customer.social || "",
    }));
  };

  const clearCustomer = () => {
    setCustomerSearch("");
    setAppointment((current) => ({
      ...current,
      customerId: "",
      customerName: "",
    }));
  };

  const handleNew = () => {
    setAppointment(EMPTY_APPOINTMENT);
    setCustomerSearch("");
    setMessage("");
    setError("");
    setConflictWarning("");
  };

  // Search existing appointments (mock) by customer name, id or date.
  const handleSearchAppointments = async () => {
    const term = appointmentSearch.trim();
    setMessage("");
    setError("");
    if (!term) {
      setAppointmentResults([]);
      setError(tr("appointment.errors.searchTerm", "Type something to search."));
      return;
    }
    const companyId = readSelectedCompanyId();
    if (!companyId) {
      setError(tr("appointment.errors.missingCompany", "No company is selected."));
      return;
    }
    setSearching(true);
    try {
      const results = await searchAppointmentsService.getAppointments({
        companyId,
        filters: { term },
      });
      setAppointmentResults(Array.isArray(results) ? results : []);
      if (!results || results.length === 0) {
        setMessage(tr("appointment.messages.notFound", "No appointments found."));
      }
    } catch (err) {
      console.error("Error searching appointments:", err);
      setAppointmentResults([]);
      setError(err?.message || tr("appointment.errors.search", "Could not search."));
    } finally {
      setSearching(false);
    }
  };

  // Load a found appointment into the form (edit mode).
  const handleLoadAppointment = (appt) => {
    // Map backend fields to the form shape.
    const loaded = {
      ...EMPTY_APPOINTMENT,
      appointmentId: appt.appointmentId || appt.appointment_id || "",
      registeredAt: appt.createdAt || appt.created_at || "",
      status: appt.status || "SCHEDULED",
      serviceId: appt.serviceId || appt.service_id || "",
      useRegisteredCustomer: Boolean(
        appt.useRegisteredCustomer ?? appt.use_registered_customer ?? true,
      ),
      customerId: appt.customerId || appt.customer_id || "",
      customerName: appt.customerName || appt.customer_name || "",
      phone: appt.phone || "",
      email: appt.email || "",
      socialLink: appt.socialLink || appt.social_link || "",
      date: appt.appointmentDate || appt.appointment_date || "",
      startHour: appt.startHour || appt.start_hour || "",
      endHour: appt.endHour || appt.end_hour || "",
      locationId: appt.locationId || appt.location_id || "",
      comments: appt.comments || "",
    };
    setAppointment(loaded);
    setCustomerSearch(loaded.customerName);
    setSelectedServiceName(""); // service name will show once known; optional
    setServiceSearch("");
    setAppointmentResults([]);
    setAppointmentSearch("");
    setMessage(tr("appointment.messages.loaded", "Appointment loaded. You can now modify it."));
    setError("");
    setConflictWarning("");
  };

  // Delete (remove) the loaded appointment. Mock only.
  const handleDeleteAppointment = async () => {
    if (!isEditing) return;
    const companyId = readSelectedCompanyId();
    if (!companyId) {
      setError(tr("appointment.errors.missingCompany", "No company is selected."));
      return;
    }
    setSaving(true);
    try {
      await deleteAppointmentService.deleteAppointment({
        companyId,
        appointmentId: appointment.appointmentId,
      });
      handleNew();
      setMessage(tr("appointment.messages.deleted", "The appointment was deleted."));
    } catch (err) {
      console.error("Error deleting appointment:", err);
      setError(err?.message || tr("appointment.errors.delete", "Could not delete."));
    } finally {
      setSaving(false);
    }
  };

  // Reject / inactivate = change the status (soft), keep the record.
  const handleRejectAppointment = async () => {
    if (!isEditing) return;
    const companyId = readSelectedCompanyId();
    if (!companyId) {
      setError(tr("appointment.errors.missingCompany", "No company is selected."));
      return;
    }
    setSaving(true);
    try {
      await saveAppointmentService.saveAppointment({
        companyId,
        appointment: {
          appointmentId: appointment.appointmentId,
          serviceId: appointment.serviceId,
          useRegisteredCustomer: Boolean(appointment.useRegisteredCustomer),
          customerId: appointment.useRegisteredCustomer ? appointment.customerId : "",
          customerName: appointment.customerName.trim(),
          phone: appointment.phone || "",
          email: appointment.email || "",
          socialLink: appointment.socialLink || "",
          appointmentDate: appointment.date,
          startHour: appointment.startHour,
          endHour: appointment.endHour,
          locationId: appointment.locationId || "",
          status: "CANCELLED",
          comments: appointment.comments || "",
        },
      });
      setAppointment((current) => ({ ...current, status: "CANCELLED" }));
      setMessage(tr("appointment.messages.rejected", "The appointment was rejected / inactivated."));
    } catch (err) {
      console.error("Error rejecting appointment:", err);
      setError(err?.message || tr("appointment.errors.reject", "Could not reject."));
    } finally {
      setSaving(false);
    }
  };

  const validate = () => {
    if (!appointment.serviceId) {
      setError(tr("appointment.errors.serviceRequired", "Please choose a service."));
      return false;
    }

    if (appointment.useRegisteredCustomer) {
      if (!appointment.customerId) {
        setError(tr("appointment.errors.customerRequired", "Please choose a registered customer."));
        return false;
      }
    } else if (!appointment.customerName.trim()) {
      setError(tr("appointment.errors.nameRequired", "Please enter the customer name."));
      return false;
    }

    if (!appointment.date) {
      setError(tr("appointment.errors.dateRequired", "Please choose a date."));
      return false;
    }
    if (!appointment.startHour || !appointment.endHour) {
      setError(tr("appointment.errors.hoursRequired", "Please set the start and end hour."));
      return false;
    }
    if (appointment.endHour <= appointment.startHour) {
      setError(tr("appointment.errors.hourOrder", "The end hour must be after the start hour."));
      return false;
    }

    return true;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage("");
    setError("");
    setConflictWarning("");

    if (!validate()) return;

    const companyId = readSelectedCompanyId();
    if (!companyId) {
      setError(tr("appointment.errors.missingCompany", "No company is selected."));
      return;
    }

    // Build the backend payload (self-reservation: the provider decides, so a
    // conflict is only a warning, never a block).
    const payload = {
      appointmentId: appointment.appointmentId || "",
      serviceId: appointment.serviceId,
      useRegisteredCustomer: Boolean(appointment.useRegisteredCustomer),
      customerId: appointment.useRegisteredCustomer ? appointment.customerId : "",
      customerName: appointment.customerName.trim(),
      phone: appointment.phone || "",
      email: appointment.email || "",
      socialLink: appointment.socialLink || "",
      appointmentDate: appointment.date,
      startHour: appointment.startHour,
      endHour: appointment.endHour,
      locationId: appointment.locationId || "",
      status: appointment.status || "SCHEDULED",
      comments: appointment.comments || "",
    };

    setSaving(true);
    try {
      const response = await saveAppointmentService.saveAppointment({
        companyId,
        appointment: payload,
      });

      const saved = response?.result?.appointment;
      const conflicts = Number(response?.result?.conflictCount) || 0;
      const otherLocations = Number(response?.result?.otherLocationCount) || 0;

      // Adopt the id/date returned by the backend so a second save updates.
      if (saved) {
        setAppointment((current) => ({
          ...current,
          appointmentId:
            saved.appointmentId || saved.appointment_id || current.appointmentId,
          status: saved.status || current.status,
        }));
      }

      const warnings = [];
      if (conflicts > 0) {
        warnings.push(
          tr(
            "appointment.messages.conflict",
            "Heads up: this schedule is already taken by {count} appointment(s).",
          ).replace("{count}", String(conflicts)),
        );
      }
      // One location at a time (2026-11-07): the same time in another place.
      if (otherLocations > 0) {
        warnings.push(
          tr(
            "appointment.messages.otherLocation",
            "Heads up: at this time you already have {count} appointment(s) in another location.",
          ).replace("{count}", String(otherLocations)),
        );
      }
      if (warnings.length > 0) setConflictWarning(warnings.join(" "));

      setMessage(tr("appointment.messages.saved", "The appointment was saved successfully."));
    } catch (err) {
      console.error("Error saving appointment:", err);
      setError(
        err?.message ||
          tr("appointment.errors.save", "The appointment could not be saved."),
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="reservation">
      <header className="reservation__header">
        <div>
          <p className="reservation__eyebrow">
            {tr("appointment.eyebrow", "Appointments")}
          </p>
          <h1>
            {isEditing
              ? tr("appointment.titleEdit", "Edit appointment")
              : tr("appointment.title", "Place an appointment")}
          </h1>
          <p>
            {tr(
              "appointment.description",
              "As the service provider, register or modify an appointment for a customer.",
            )}
          </p>
        </div>
        <span className="reservation__status">
          <FaCalendarCheck aria-hidden="true" />{" "}
          {STATUS_OPTIONS.find((s) => s.value === appointment.status)?.label ||
            appointment.status}
        </span>
      </header>

      {message && (
        <div className="reservation__alert reservation__alert--success">
          <FaCircleCheck aria-hidden="true" /> <span>{message}</span>
        </div>
      )}
      {error && (
        <div className="reservation__alert reservation__alert--error">
          <FaCircleExclamation aria-hidden="true" /> <span>{error}</span>
        </div>
      )}
      {conflictWarning && (
        <div className="reservation__alert reservation__alert--warning">
          <FaTriangleExclamation aria-hidden="true" /> <span>{conflictWarning}</span>
        </div>
      )}

      {/* ---------- Search existing appointments ---------- */}
      <div className="reservation__searchbar">
        <div className="reservation__searchbar-input">
          <input
            value={appointmentSearch}
            onChange={(event) => setAppointmentSearch(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") handleSearchAppointments();
            }}
            placeholder={tr(
              "appointment.search.placeholder",
              "Search an appointment by customer, id or date",
            )}
          />
          <button type="button" onClick={handleSearchAppointments}>
            {tr("appointment.actions.search", "Search")}
          </button>
        </div>

        {appointmentResults.length > 0 && (
          <ul className="reservation__search-results">
            {appointmentResults.map((appt) => (
              <li key={appt.appointmentId}>
                <button type="button" onClick={() => handleLoadAppointment(appt)}>
                  <strong>{appt.customerName}</strong>
                  <small>
                    {appt.date} · {appt.startHour}-{appt.endHour} · {appt.status}
                    {locationsOn && appt.locationName ? ` · ${appt.locationName}` : ""}
                  </small>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <form onSubmit={handleSubmit}>
        {/* ---------- Service + customer ---------- */}
        <div className="reservation__panel">
          <div className="reservation__panel-title">
            <span>1</span>
            <div>
              <h2>{tr("appointment.customer.title", "Service and customer")}</h2>
              <p>{tr("appointment.customer.description", "Choose the service and who it is for.")}</p>
            </div>
          </div>

          <div className="reservation__grid reservation__grid--single">
            <div className="reservation__field">
              <label htmlFor="appt-service">
                {tr("appointment.fields.service", "Service")}
                <span className="reservation__required">*</span>
              </label>
              <div className="reservation__autocomplete-wrap">
                <input
                  id="appt-service"
                  value={
                    appointment.serviceId
                      ? selectedServiceName
                      : serviceSearch
                  }
                  onChange={(event) => {
                    if (appointment.serviceId) {
                      // Clear the chosen service when the user edits again.
                      setAppointment((current) => ({ ...current, serviceId: "" }));
                      setSelectedServiceName("");
                    }
                    setServiceSearch(event.target.value);
                  }}
                  placeholder={tr("appointment.fields.servicePlaceholder", "Search a service")}
                  autoComplete="off"
                />
                {serviceResults.length > 0 && !appointment.serviceId && (
                  <div className="reservation__results">
                    {serviceResults.map((service) => (
                      <button
                        key={service.id}
                        type="button"
                        onClick={() => {
                          setAppointment((current) => ({ ...current, serviceId: service.id }));
                          setSelectedServiceName(service.name);
                          setServiceSearch(service.name);
                          setServiceResults([]);
                        }}
                      >
                        <span>{service.name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>


          </div>

          <label className="reservation__check">
            <input
              type="checkbox"
              checked={appointment.useRegisteredCustomer}
              onChange={toggleRegisteredCustomer}
            />
            <span>{tr("appointment.fields.useRegistered", "Select a registered customer")}</span>
          </label>

          {appointment.useRegisteredCustomer ? (
            <div className="reservation__field reservation__autocomplete-wrap">
              <label htmlFor="appt-customer-search">
                <FaUser aria-hidden="true" /> {tr("appointment.fields.registeredCustomer", "Registered customer")}
                <span className="reservation__required">*</span>
              </label>
              <input
                id="appt-customer-search"
                value={customerSearch}
                onChange={(event) => {
                  setCustomerSearch(event.target.value);
                  if (appointment.customerId) {
                    setAppointment((current) => ({ ...current, customerId: "", customerName: "" }));
                  }
                }}
                placeholder={tr("appointment.fields.customerSearchPlaceholder", "Search by name, phone or email")}
              />
              {customerResults.length > 0 && (
                <div className="reservation__results">
                  {customerResults.map((customer) => (
                    <button key={customer.id} type="button" onClick={() => selectCustomer(customer)}>
                      <span>{customer.name}</span>
                      <small>{customer.phone} · {customer.email}</small>
                    </button>
                  ))}
                </div>
              )}
              {appointment.customerId && (
                <div className="reservation__selected">
                  <strong>{appointment.customerName}</strong>
                  <button type="button" onClick={clearCustomer}>
                    {tr("appointment.actions.change", "Change")}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="reservation__field">
              <label htmlFor="appt-customer-name">
                <FaUser aria-hidden="true" /> {tr("appointment.fields.customerName", "Customer name")}
                <span className="reservation__required">*</span>
              </label>
              <input
                id="appt-customer-name"
                name="customerName"
                value={appointment.customerName}
                onChange={updateField}
                placeholder={tr("appointment.fields.customerNamePlaceholder", "Example: Andrea Vargas")}
              />
            </div>
          )}
        </div>

        {/* ---------- Contact ---------- */}
        <div className="reservation__panel">
          <div className="reservation__panel-title">
            <span>2</span>
            <div>
              <h2>{tr("appointment.contact.title", "Contact")}</h2>
              <p>{tr("appointment.contact.description", "How to reach the customer.")}</p>
            </div>
          </div>

          <div className="reservation__grid">
            <div className="reservation__field">
              <label htmlFor="appt-phone"><FaPhone aria-hidden="true" /> {tr("appointment.fields.phone", "Phone")}</label>
              <input id="appt-phone" name="phone" value={appointment.phone} onChange={updateField} placeholder="+506 8888-0000" />
            </div>
            <div className="reservation__field">
              <label htmlFor="appt-email"><FaEnvelope aria-hidden="true" /> {tr("appointment.fields.email", "Email")}</label>
              <input id="appt-email" name="email" type="email" value={appointment.email} onChange={updateField} placeholder="name@example.com" />
              {!String(appointment.email || "").trim() && (
                <small className="reservation__notify-warning" role="status">
                  {tr(
                    "appointment.fields.emailMissing",
                    "Without an email the customer won't receive updates about this appointment."
                  )}
                </small>
              )}
            </div>
            <div className="reservation__field">
              <label htmlFor="appt-social"><FaLink aria-hidden="true" /> {tr("appointment.fields.social", "Social network link")}</label>
              <input id="appt-social" name="socialLink" value={appointment.socialLink} onChange={updateField} placeholder="https://..." />
            </div>
          </div>
        </div>

        {/* ---------- Date and time ---------- */}
        <div className="reservation__panel">
          <div className="reservation__panel-title">
            <span>3</span>
            <div>
              <h2>{tr("appointment.schedule.title", "Date and time")}</h2>
              <p>{tr("appointment.schedule.description", "Set the day and the start/end hour.")}</p>
            </div>
          </div>

          <div className="reservation__grid">
            <div className="reservation__field">
              <label htmlFor="appt-date">
                <FaCalendarDay aria-hidden="true" /> {tr("appointment.fields.date", "Date")}
                <span className="reservation__required">*</span>
              </label>
              <input id="appt-date" type="date" name="date" value={appointment.date} onChange={updateField} />
            </div>
            <div className="reservation__field">
              <label htmlFor="appt-start">
                <FaClock aria-hidden="true" /> {tr("appointment.fields.startHour", "Start hour")}
                <span className="reservation__required">*</span>
              </label>
              <input id="appt-start" type="time" name="startHour" value={appointment.startHour} onChange={updateField} />
            </div>
            <div className="reservation__field">
              <label htmlFor="appt-end">
                <FaClock aria-hidden="true" /> {tr("appointment.fields.endHour", "End hour")}
                <span className="reservation__required">*</span>
              </label>
              <input id="appt-end" type="time" name="endHour" value={appointment.endHour} onChange={updateField} />
            </div>
          </div>

          {locationOptions.length > 0 && (
            <div className="reservation__grid reservation__grid--single">
              <div className="reservation__field">
                <label htmlFor="appt-location">
                  <FaLocationDot aria-hidden="true" /> {tr("appointment.fields.location", "Location")}
                </label>
                <select id="appt-location" name="locationId" value={appointment.locationId} onChange={updateField}>
                  <option value="">{tr("appointment.fields.noLocation", "No location")}</option>
                  {locationOptions.map((location) => (
                    <option key={location.locationId} value={location.locationId}>
                      {location.name}
                      {location.address ? ` — ${location.address}` : ""}
                      {location.active ? "" : ` (${tr("appointment.fields.locationDisabled", "disabled")})`}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

        </div>

        {/* ---------- Comments ---------- */}
        <div className="reservation__panel">
          <div className="reservation__panel-title">
            <span>4</span>
            <div>
              <h2>{tr("appointment.details.title", "Comments")}</h2>
              <p>{tr("appointment.details.description", "Any note about this appointment.")}</p>
            </div>
          </div>

          <div className="reservation__field">
            <label htmlFor="appt-comments">{tr("appointment.fields.comments", "Comments")}</label>
            <textarea
              id="appt-comments"
              name="comments"
              rows="4"
              value={appointment.comments}
              onChange={updateField}
              placeholder={tr("appointment.fields.commentsPlaceholder", "Add any detail about this appointment.")}
            />
          </div>

          {isEditing && (
            <div className="reservation__summary">
              <strong>{tr("appointment.summary.reference", "Reference")}</strong>
              <span>
                {tr("appointment.summary.id", "ID")}: {appointment.appointmentId}
                {appointment.registeredAt ? ` · ${appointment.registeredAt}` : ""}
              </span>
            </div>
          )}
        </div>

        <footer className="reservation__footer">
          {isEditing && (
            <>
              <button
                type="button"
                className="reservation__button reservation__button--danger"
                onClick={handleDeleteAppointment}
              >
                <FaTrash aria-hidden="true" /> {tr("appointment.actions.delete", "Delete")}
              </button>
              <button
                type="button"
                className="reservation__button reservation__button--warning"
                onClick={handleRejectAppointment}
              >
                {tr("appointment.actions.reject", "Reject / Inactivate")}
              </button>
            </>
          )}
          <button type="button" className="reservation__button" onClick={handleNew}>
            {tr("appointment.actions.new", "New")}
          </button>
          <button type="button" className="reservation__button" onClick={onCancel}>
            {tr("appointment.actions.close", "Close")}
          </button>
          <button type="submit" className="reservation__button reservation__button--primary">
            {isEditing ? <FaPen aria-hidden="true" /> : <FaFloppyDisk aria-hidden="true" />}{" "}
            {isEditing
              ? tr("appointment.actions.update", "Update appointment")
              : tr("appointment.actions.save", "Save appointment")}
          </button>
        </footer>
      </form>
    </section>
  );
}