import { useCallback, useEffect, useMemo, useState } from "react";
import {
  FaArrowUpRightFromSquare,
  FaBan,
  FaCircleCheck,
  FaCrosshairs,
  FaFloppyDisk,
  FaLink,
  FaLocationDot,
  FaMapLocationDot,
  FaPlus,
  FaTrash,
  FaTriangleExclamation,
  FaXmark,
} from "react-icons/fa6";

import "./LocationsMaintenance.scss";

import LocationsService from "../services/LocationsService";
import {
  mapsUrl,
  overlapMessage,
  overlapsFromError,
  parseMapsLink,
  roundCoordinate,
} from "../services/locationUtils";

// Locations ("Sedes", 2026-11-07): the places where the company attends
// appointments, and the company switch "We can attend in more than one
// location at the same time". A location is optional on each block of hours
// (Booking schedules) and on each appointment.

const SELECTED_COMPANY_STORAGE_KEY = "selectedCompany";
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

const EMPTY_FORM = {
  locationId: "",
  name: "",
  address: "",
  details: "",
  latitude: "",
  longitude: "",
  active: true,
};

function toForm(location) {
  if (!location) return { ...EMPTY_FORM };
  return {
    locationId: String(location.locationId || ""),
    name: String(location.name || ""),
    address: String(location.address || ""),
    details: String(location.details || ""),
    latitude: location.latitude === null || location.latitude === undefined ? "" : String(location.latitude),
    longitude: location.longitude === null || location.longitude === undefined ? "" : String(location.longitude),
    active: location.active !== false,
  };
}

function textOrNull(value) {
  const text = String(value ?? "").trim();
  return text === "" ? null : text;
}

function numberOrNull(value) {
  const text = String(value ?? "").trim().replace(",", ".");
  if (text === "") return null;
  const number = Number(text);
  return Number.isFinite(number) ? roundCoordinate(number) : NaN;
}

export default function LocationsMaintenance({ t }) {
  const [companyId, setCompanyId] = useState(() => readSelectedCompanyId());
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [settings, setSettings] = useState({ locationsEnabled: false, locationsSameTime: false });
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [settingsMessage, setSettingsMessage] = useState("");
  const [overlaps, setOverlaps] = useState([]);

  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [warning, setWarning] = useState("");
  const [generalError, setGeneralError] = useState("");

  const [mapsLink, setMapsLink] = useState("");
  const [gpsBusy, setGpsBusy] = useState(false);
  const [confirm, setConfirm] = useState(null); // { type: "disable" | "delete", location }

  const tr = useMemo(
    () => (key, fallback, options = {}) => {
      try {
        if (typeof t !== "function") return fallback;
        const value = t(key, { defaultValue: fallback, ...options });
        return !value || value === key ? fallback : value;
      } catch {
        return fallback;
      }
    },
    [t],
  );

  const selected = useMemo(
    () => locations.find((item) => item.locationId === form.locationId) || null,
    [locations, form.locationId],
  );
  const isEditing = Boolean(form.locationId);
  const activeCount = locations.filter((item) => item.active).length;

  const clearNotices = () => {
    setMessage("");
    setWarning("");
    setGeneralError("");
    setOverlaps([]);
  };

  const loadAll = useCallback(
    async (id, { keepForm = false } = {}) => {
      if (!id) {
        setLocations([]);
        setLoading(false);
        setLoadError(tr("locations.errors.missingCompany", "No company is selected."));
        return;
      }
      setLoading(true);
      setLoadError("");
      try {
        const [list, companySettings] = await Promise.all([
          locationsService.list({ companyId: id, includeInactive: true }),
          locationsService
            .getSettings({ companyId: id })
            .catch(() => ({ locationsEnabled: false, locationsSameTime: false })),
        ]);
        setLocations(list);
        setSettings({
          locationsEnabled: Boolean(companySettings?.locationsEnabled),
          locationsSameTime: Boolean(companySettings?.locationsSameTime),
        });
        if (!keepForm) setForm({ ...EMPTY_FORM });
      } catch (error) {
        setLoadError(error?.message || tr("locations.errors.load", "The locations could not be loaded."));
      } finally {
        setLoading(false);
      }
    },
    [tr],
  );

  useEffect(() => {
    loadAll(companyId);
  }, [companyId, loadAll]);

  // The header sends this event when the user switches companies.
  useEffect(() => {
    const onCompanyChanged = () => {
      setCompanyId(readSelectedCompanyId());
      setForm({ ...EMPTY_FORM });
      clearNotices();
    };
    window.addEventListener("selectedCompanyChanged", onCompanyChanged);
    return () => window.removeEventListener("selectedCompanyChanged", onCompanyChanged);
  }, []);

  const updateField = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
    setErrors((current) => ({ ...current, [name]: "" }));
    setMessage("");
  };

  const handleNew = () => {
    setForm({ ...EMPTY_FORM });
    setErrors({});
    setMapsLink("");
    clearNotices();
  };

  const handleSelect = (location) => {
    setForm(toForm(location));
    setErrors({});
    setMapsLink("");
    clearNotices();
  };

  // ---- Map point ----
  const setPoint = (point) => {
    setForm((current) => ({
      ...current,
      latitude: String(point.latitude),
      longitude: String(point.longitude),
    }));
    setErrors((current) => ({ ...current, latitude: "", longitude: "" }));
  };

  const handleUseMyLocation = () => {
    clearNotices();
    if (typeof window !== "undefined" && window.isSecureContext === false) {
      setWarning(
        tr(
          "locations.map.insecure",
          "The browser gives your location only on secure pages (https) or on localhost. Paste a Google Maps link instead.",
        ),
      );
      return;
    }
    if (!navigator?.geolocation) {
      setWarning(tr("locations.map.noGps", "This browser cannot give your location. Paste a Google Maps link instead."));
      return;
    }
    setGpsBusy(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setGpsBusy(false);
        setPoint({
          latitude: roundCoordinate(position.coords.latitude),
          longitude: roundCoordinate(position.coords.longitude),
        });
        setMessage(
          tr("locations.map.gpsDone", "Point taken from your current location. Check it with \"Open in Maps\" and save."),
        );
      },
      (error) => {
        setGpsBusy(false);
        setWarning(
          error?.code === 1
            ? tr(
                "locations.map.gpsDenied",
                "The location permission was denied. Allow it in the browser, or paste a Google Maps link.",
              )
            : tr("locations.map.gpsFailed", "Your location could not be read. Try again or paste a Google Maps link."),
        );
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 },
    );
  };

  const handleReadLink = () => {
    clearNotices();
    const point = parseMapsLink(mapsLink);
    if (!point) {
      setWarning(
        tr(
          "locations.map.linkInvalid",
          "No map point was found in that text. In Google Maps open the place and copy the address bar link (it has @latitude,longitude).",
        ),
      );
      return;
    }
    if (point.shortLink) {
      setWarning(
        tr(
          "locations.map.shortLink",
          "Short links (maps.app.goo.gl) do not include the point. Open the link, then copy the long link from the address bar and paste it here.",
        ),
      );
      return;
    }
    setPoint(point);
    setMapsLink("");
    setMessage(tr("locations.map.linkDone", "Point read from the link. Check it with \"Open in Maps\" and save."));
  };

  const handleClearPoint = () => {
    setForm((current) => ({ ...current, latitude: "", longitude: "" }));
    setErrors((current) => ({ ...current, latitude: "", longitude: "" }));
  };

  const previewMapsUrl = mapsUrl({
    address: form.address,
    latitude: form.latitude === "" ? null : numberOrNull(form.latitude),
    longitude: form.longitude === "" ? null : numberOrNull(form.longitude),
  });

  // ---- Save ----
  const validate = () => {
    const next = {};
    if (!form.name.trim()) next.name = tr("locations.errors.nameRequired", "Write the name of the location.");
    const lat = numberOrNull(form.latitude);
    const lng = numberOrNull(form.longitude);
    if ((lat === null) !== (lng === null)) {
      next.latitude = tr("locations.errors.pointBoth", "Write both latitude and longitude, or none.");
    } else if (lat !== null) {
      if (Number.isNaN(lat) || lat < -90 || lat > 90) {
        next.latitude = tr("locations.errors.latitude", "Latitude must be a number between -90 and 90.");
      }
      if (Number.isNaN(lng) || lng < -180 || lng > 180) {
        next.longitude = tr("locations.errors.longitude", "Longitude must be a number between -180 and 180.");
      }
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSave = async (event) => {
    event.preventDefault();
    clearNotices();
    if (!validate()) return;
    if (!companyId) {
      setGeneralError(tr("locations.errors.missingCompany", "No company is selected."));
      return;
    }

    const payload = {
      locationId: form.locationId || "",
      name: form.name.trim(),
      address: textOrNull(form.address),
      details: textOrNull(form.details),
      latitude: numberOrNull(form.latitude),
      longitude: numberOrNull(form.longitude),
    };

    setSaving(true);
    try {
      const saved = await locationsService.save({ companyId, location: payload });
      await loadAll(companyId, { keepForm: true });
      if (saved) setForm(toForm(saved));
      setMessage(
        isEditing
          ? tr("locations.messages.updated", "The location was updated.")
          : tr("locations.messages.created", "The location was created. Now choose it on the hours of your Booking schedules."),
      );
    } catch (error) {
      if (error?.status === 409) {
        setErrors({ name: tr("locations.errors.nameTaken", "Another location already has this name.") });
      } else {
        setGeneralError(error?.message || tr("locations.errors.save", "The location could not be saved."));
      }
    } finally {
      setSaving(false);
    }
  };

  // ---- Enable / disable / delete ----
  const runSetActive = async (location, active) => {
    clearNotices();
    setSaving(true);
    try {
      const result = await locationsService.setActive({ companyId, locationId: location.locationId, active });
      await loadAll(companyId, { keepForm: true });
      if (result?.location) setForm(toForm(result.location));
      if (active) {
        setMessage(tr("locations.messages.enabled", "The location was enabled. The store offers its hours again."));
      } else {
        setMessage(tr("locations.messages.disabled", "The location was disabled. The store no longer offers its hours."));
        const future = Number(result?.futureAppointments) || 0;
        if (future > 0) {
          setWarning(
            tr(
              "locations.messages.disabledWithAppointments",
              "It has {{count}} upcoming appointment(s): they keep this location. Tell those customers if needed.",
              { count: future },
            ).replace("{{count}}", String(future)),
          );
        }
      }
    } catch (error) {
      const clashes = overlapsFromError(error);
      if (clashes.length) {
        setOverlaps(clashes);
        setGeneralError(
          tr(
            "locations.errors.enableOverlap",
            "It can not be enabled: its hours are the same as the hours of another location (one location at a time).",
          ),
        );
      } else {
        setGeneralError(error?.message || tr("locations.errors.status", "The status could not be changed."));
      }
    } finally {
      setSaving(false);
    }
  };

  const askDisable = (location) => {
    if ((Number(location?.usage?.futureAppointments) || 0) > 0) {
      setConfirm({ type: "disable", location });
      return;
    }
    runSetActive(location, false);
  };

  const runDelete = async (location) => {
    clearNotices();
    setSaving(true);
    try {
      const result = await locationsService.remove({ companyId, locationId: location.locationId });
      await loadAll(companyId, { keepForm: Boolean(result?.disabled) });
      if (result?.disabled) {
        setWarning(
          tr(
            "locations.messages.usedDisabled",
            "This location is used by schedules or appointments, so it was disabled instead of deleted (its history stays).",
          ),
        );
        setForm((current) => ({ ...current, active: false }));
      } else {
        setMessage(tr("locations.messages.deleted", "The location was deleted."));
      }
    } catch (error) {
      setGeneralError(error?.message || tr("locations.errors.delete", "The location could not be deleted."));
    } finally {
      setSaving(false);
    }
  };

  const confirmAction = () => {
    const current = confirm;
    setConfirm(null);
    if (!current) return;
    if (current.type === "disable") runSetActive(current.location, false);
    if (current.type === "delete") runDelete(current.location);
  };

  // ---- Company switches (2026-11-08: "We use locations" + "same time") ----
  const saveSwitch = async (field, next) => {
    const previous = settings;
    clearNotices();
    setSettingsMessage("");
    setSettingsSaving(true);
    setSettings({ ...previous, [field]: next });
    try {
      const saved = await locationsService.saveSettings({ companyId, [field]: next });
      setSettings({
        locationsEnabled: Boolean(saved?.locationsEnabled ?? (field === "locationsEnabled" ? next : previous.locationsEnabled)),
        locationsSameTime: Boolean(saved?.locationsSameTime ?? (field === "locationsSameTime" ? next : previous.locationsSameTime)),
      });
      if (field === "locationsEnabled") {
        setSettingsMessage(
          next
            ? tr("locations.settings.enabledOn", "Saved: AlephK now uses your locations.")
            : tr("locations.settings.enabledOff", "Saved: locations are hidden everywhere. Your locations are kept."),
        );
      } else {
        setSettingsMessage(
          next
            ? tr("locations.settings.savedOn", "Saved: several locations can have the same hours.")
            : tr("locations.settings.savedOff", "Saved: one location at a time."),
        );
      }
    } catch (error) {
      setSettings(previous);
      const clashes = overlapsFromError(error);
      if (clashes.length) {
        setOverlaps(clashes);
        setSettingsMessage(
          field === "locationsEnabled"
            ? tr(
                "locations.settings.enableRefused",
                "Locations can not be turned on yet: these hours are in two locations at the same time. Change them in Booking schedules first, or turn on \"We can attend in more than one location at the same time\".",
              )
            : tr(
                "locations.settings.offRefused",
                "It can not be turned off yet: these hours are in two locations at the same time. Change them in Booking schedules first.",
              ),
        );
      } else {
        setSettingsMessage(error?.message || tr("locations.settings.saveError", "The setting could not be saved."));
      }
    } finally {
      setSettingsSaving(false);
    }
  };

  const handleEnabledChange = (event) => saveSwitch("locationsEnabled", event.target.checked);
  const handleSameTimeChange = (event) => saveSwitch("locationsSameTime", event.target.checked);

  const usageText = (location) => {
    const usage = location?.usage || {};
    const hours = (Number(usage.recurringRanges) || 0) + (Number(usage.manualSlots) || 0);
    const upcoming = Number(usage.futureAppointments) || 0;
    if (!hours && !Number(usage.appointments)) return tr("locations.list.notUsed", "Not used yet");
    return tr("locations.list.usage", "{{hours}} block(s) of hours · {{upcoming}} upcoming appointment(s)", {
      hours,
      upcoming,
    })
      .replace("{{hours}}", String(hours))
      .replace("{{upcoming}}", String(upcoming));
  };

  return (
    <section className="locations-maintenance">
      <header className="locations-maintenance__header">
        <div>
          <p className="locations-maintenance__eyebrow">{tr("locations.eyebrow", "Bookings")}</p>
          <h1>
            <FaMapLocationDot aria-hidden="true" /> {tr("locations.title", "Locations")}
          </h1>
          <p>
            {tr(
              "locations.description",
              "The places where you attend appointments. Choose a location on each block of hours in Booking schedules; the store shows the times by location.",
            )}
          </p>
        </div>
        <button className="locations-button locations-button--secondary" type="button" onClick={handleNew}>
          <FaPlus aria-hidden="true" /> {tr("locations.actions.new", "New location")}
        </button>
      </header>

      <section className="locations-switch locations-switch--main" aria-live="polite">
        <label className="locations-switch__toggle">
          <input
            type="checkbox"
            checked={settings.locationsEnabled}
            disabled={settingsSaving || loading || !companyId}
            onChange={handleEnabledChange}
            aria-label={tr("locations.settings.enabledTitle", "We use locations")}
          />
          <span aria-hidden="true" />
        </label>
        <div>
          <strong>{tr("locations.settings.enabledTitle", "We use locations")}</strong>
          <p>
            {settings.locationsEnabled
              ? tr(
                  "locations.settings.enabledOnHelp",
                  "ON: choose a location on each block of hours in Booking schedules (or let the customer choose). The store, the forms and the emails show the location.",
                )
              : tr(
                  "locations.settings.enabledOffHelp",
                  "OFF: AlephK works without locations. The store, the schedules, the forms and the emails show no location. You can prepare your locations here and turn this on when you are ready.",
                )}
          </p>
          {settingsMessage && <p className="locations-switch__message">{settingsMessage}</p>}
        </div>
      </section>

      <section
        className={`locations-switch${settings.locationsEnabled ? "" : " locations-switch--disabled"}`}
        aria-live="polite"
      >
        <label className="locations-switch__toggle">
          <input
            type="checkbox"
            checked={settings.locationsSameTime}
            disabled={settingsSaving || loading || !companyId || !settings.locationsEnabled}
            onChange={handleSameTimeChange}
            aria-label={tr("locations.settings.title", "We can attend in more than one location at the same time")}
          />
          <span aria-hidden="true" />
        </label>
        <div>
          <strong>{tr("locations.settings.title", "We can attend in more than one location at the same time")}</strong>
          <p>
            {!settings.locationsEnabled
              ? tr("locations.settings.needsEnabled", "Available when \"We use locations\" is on.")
              : settings.locationsSameTime
              ? tr(
                  "locations.settings.onHelp",
                  "ON: several people or offices attend at the same time, so different locations can have the same hours. Each location has its own places.",
                )
              : tr(
                  "locations.settings.offHelp",
                  "OFF (recommended for one person): you are in one location at a time, so the same hours can not be in two different locations.",
                )}
          </p>
        </div>
      </section>

      {overlaps.length > 0 && (
        <div className="locations-alert locations-alert--warning" role="alert">
          <FaTriangleExclamation aria-hidden="true" />
          <div>
            <strong>{tr("locations.overlap.title", "Hours in two locations at the same time")}</strong>
            <ul>
              {overlaps.map((overlap, index) => (
                <li key={index}>{overlapMessage(t, overlap)}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {loadError && (
        <div className="locations-alert locations-alert--error" role="alert">
          <FaTriangleExclamation aria-hidden="true" /> <span>{loadError}</span>
        </div>
      )}

      <div className="locations-maintenance__layout">
        <aside className="locations-list" aria-busy={loading}>
          <div className="locations-list__title">
            <strong>{tr("locations.list.title", "Your locations")}</strong>
            <span>
              {tr("locations.list.count", "{{active}} active of {{total}}", { active: activeCount, total: locations.length })
                .replace("{{active}}", String(activeCount))
                .replace("{{total}}", String(locations.length))}
            </span>
          </div>

          {loading ? (
            <p className="locations-list__empty">{tr("locations.list.loading", "Loading…")}</p>
          ) : locations.length === 0 ? (
            <div className="locations-list__empty">
              <FaLocationDot aria-hidden="true" />
              <strong>{tr("locations.list.empty", "No locations yet")}</strong>
              <span>
                {tr(
                  "locations.list.emptyHelp",
                  "With only one place you do not need locations. Add them when you attend in two or more places (for example Heredia and San Pedro).",
                )}
              </span>
            </div>
          ) : (
            <ul>
              {locations.map((location) => (
                <li key={location.locationId}>
                  <button
                    type="button"
                    className={[
                      "locations-list__item",
                      location.locationId === form.locationId ? "is-selected" : "",
                      location.active ? "" : "is-disabled",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    onClick={() => handleSelect(location)}
                  >
                    <FaLocationDot aria-hidden="true" />
                    <span className="locations-list__text">
                      <strong>{location.name}</strong>
                      {location.address && <small>{location.address}</small>}
                      <em>{usageText(location)}</em>
                    </span>
                    <span className={`locations-badge ${location.active ? "is-active" : "is-off"}`}>
                      {location.active ? tr("locations.status.active", "Active") : tr("locations.status.disabled", "Disabled")}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </aside>

        <form className="locations-form" onSubmit={handleSave} noValidate>
          <h2>
            {isEditing ? tr("locations.form.editTitle", "Edit location") : tr("locations.form.newTitle", "New location")}
            {isEditing && !form.active && (
              <span className="locations-badge is-off">{tr("locations.status.disabled", "Disabled")}</span>
            )}
          </h2>

          <label className="locations-field">
            <span>{tr("locations.fields.name", "Name")} *</span>
            <input
              name="name"
              value={form.name}
              maxLength={120}
              placeholder={tr("locations.fields.namePlaceholder", "e.g. Heredia office")}
              onChange={updateField}
              aria-invalid={Boolean(errors.name)}
            />
            {errors.name && <small className="locations-field__error">{errors.name}</small>}
          </label>

          <label className="locations-field">
            <span>{tr("locations.fields.address", "Address")}</span>
            <input
              name="address"
              value={form.address}
              maxLength={300}
              placeholder={tr("locations.fields.addressPlaceholder", "e.g. 100 m north of the park, Heredia")}
              onChange={updateField}
            />
          </label>

          <label className="locations-field">
            <span>{tr("locations.fields.details", "Details")}</span>
            <textarea
              name="details"
              rows={2}
              value={form.details}
              maxLength={500}
              placeholder={tr("locations.fields.detailsPlaceholder", "Floor, office number, parking…")}
              onChange={updateField}
            />
          </label>

          <fieldset className="locations-map">
            <legend>{tr("locations.map.title", "Map point (optional)")}</legend>
            <p>
              {tr(
                "locations.map.help",
                "Customers get an \"Open in Maps\" link. Without a point the link uses the address.",
              )}
            </p>

            <div className="locations-map__actions">
              <button
                type="button"
                className="locations-button locations-button--secondary"
                onClick={handleUseMyLocation}
                disabled={gpsBusy}
              >
                <FaCrosshairs aria-hidden="true" />
                {gpsBusy ? tr("locations.map.gpsBusy", "Reading…") : tr("locations.map.useGps", "Use my current location")}
              </button>
            </div>

            <div className="locations-map__link">
              <label className="locations-field">
                <span>{tr("locations.map.pasteLink", "Paste a Google Maps link")}</span>
                <input
                  value={mapsLink}
                  placeholder="https://www.google.com/maps/place/…/@9.998,-84.117,17z"
                  onChange={(event) => setMapsLink(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      handleReadLink();
                    }
                  }}
                />
              </label>
              <button
                type="button"
                className="locations-button locations-button--secondary"
                onClick={handleReadLink}
                disabled={!mapsLink.trim()}
              >
                <FaLink aria-hidden="true" /> {tr("locations.map.readLink", "Read point")}
              </button>
            </div>

            <div className="locations-map__coords">
              <label className="locations-field">
                <span>{tr("locations.fields.latitude", "Latitude")}</span>
                <input
                  name="latitude"
                  inputMode="decimal"
                  value={form.latitude}
                  placeholder="9.998"
                  onChange={updateField}
                  aria-invalid={Boolean(errors.latitude)}
                />
                {errors.latitude && <small className="locations-field__error">{errors.latitude}</small>}
              </label>
              <label className="locations-field">
                <span>{tr("locations.fields.longitude", "Longitude")}</span>
                <input
                  name="longitude"
                  inputMode="decimal"
                  value={form.longitude}
                  placeholder="-84.117"
                  onChange={updateField}
                  aria-invalid={Boolean(errors.longitude)}
                />
                {errors.longitude && <small className="locations-field__error">{errors.longitude}</small>}
              </label>
              {(form.latitude || form.longitude) && (
                <button
                  type="button"
                  className="locations-icon-button"
                  onClick={handleClearPoint}
                  aria-label={tr("locations.map.clear", "Remove the point")}
                  title={tr("locations.map.clear", "Remove the point")}
                >
                  <FaXmark aria-hidden="true" />
                </button>
              )}
            </div>

            {previewMapsUrl ? (
              <a className="locations-map__open" href={previewMapsUrl} target="_blank" rel="noopener noreferrer">
                <FaArrowUpRightFromSquare aria-hidden="true" /> {tr("locations.map.open", "Open in Maps")}
              </a>
            ) : (
              <small className="locations-map__none">
                {tr("locations.map.none", "No point and no address yet: customers get no map link.")}
              </small>
            )}
          </fieldset>

          {message && (
            <div className="locations-alert locations-alert--success" role="status">
              <FaCircleCheck aria-hidden="true" /> <span>{message}</span>
            </div>
          )}
          {warning && (
            <div className="locations-alert locations-alert--warning" role="status">
              <FaTriangleExclamation aria-hidden="true" /> <span>{warning}</span>
            </div>
          )}
          {generalError && (
            <div className="locations-alert locations-alert--error" role="alert">
              <FaTriangleExclamation aria-hidden="true" /> <span>{generalError}</span>
            </div>
          )}

          <div className="locations-form__actions">
            {isEditing && selected && (
              <>
                {form.active ? (
                  <button
                    type="button"
                    className="locations-button locations-button--ghost"
                    onClick={() => askDisable(selected)}
                    disabled={saving}
                  >
                    <FaBan aria-hidden="true" /> {tr("locations.actions.disable", "Disable")}
                  </button>
                ) : (
                  <button
                    type="button"
                    className="locations-button locations-button--ghost"
                    onClick={() => runSetActive(selected, true)}
                    disabled={saving}
                  >
                    <FaCircleCheck aria-hidden="true" /> {tr("locations.actions.enable", "Enable")}
                  </button>
                )}
                <button
                  type="button"
                  className="locations-button locations-button--danger"
                  onClick={() => setConfirm({ type: "delete", location: selected })}
                  disabled={saving}
                >
                  <FaTrash aria-hidden="true" /> {tr("locations.actions.delete", "Delete")}
                </button>
              </>
            )}
            <button className="locations-button locations-button--primary" type="submit" disabled={saving || !companyId}>
              <FaFloppyDisk aria-hidden="true" />
              {saving ? tr("locations.actions.saving", "Saving…") : tr("locations.actions.save", "Save")}
            </button>
          </div>
        </form>
      </div>

      {confirm && (
        <div className="locations-dialog" role="dialog" aria-modal="true" aria-labelledby="locations-dialog-title">
          <div className="locations-dialog__box">
            <h3 id="locations-dialog-title">
              {confirm.type === "delete"
                ? tr("locations.confirm.deleteTitle", "Delete {{name}}?", { name: confirm.location.name }).replace(
                    "{{name}}",
                    confirm.location.name,
                  )
                : tr("locations.confirm.disableTitle", "Disable {{name}}?", { name: confirm.location.name }).replace(
                    "{{name}}",
                    confirm.location.name,
                  )}
            </h3>
            <p>
              {confirm.type === "delete"
                ? tr(
                    "locations.confirm.deleteText",
                    "If schedules or appointments use it, it is disabled instead of deleted, so their history stays.",
                  )
                : tr(
                    "locations.confirm.disableText",
                    "It has {{count}} upcoming appointment(s). They keep this location; the store stops offering its hours. Tell those customers if needed.",
                    { count: confirm.location?.usage?.futureAppointments || 0 },
                  ).replace("{{count}}", String(confirm.location?.usage?.futureAppointments || 0))}
            </p>
            <div className="locations-dialog__actions">
              <button type="button" className="locations-button locations-button--secondary" onClick={() => setConfirm(null)}>
                {tr("locations.actions.cancel", "Cancel")}
              </button>
              <button
                type="button"
                className={`locations-button ${confirm.type === "delete" ? "locations-button--danger" : "locations-button--primary"}`}
                onClick={confirmAction}
              >
                {confirm.type === "delete"
                  ? tr("locations.actions.delete", "Delete")
                  : tr("locations.actions.disable", "Disable")}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
