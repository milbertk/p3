import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { FaFloppyDisk, FaLocationDot, FaTriangleExclamation } from "react-icons/fa6";

import "./AppointmentLocationEditor.scss";
import LocationsService from "../services/LocationsService";

const locationsService = new LocationsService();

/**
 * Location of one appointment or booking request (2026-11-08), used in
 * Booking requests (before approving) and Appointments. Shows the active
 * locations (+ the current one even if disabled), saves only the location and
 * tells the result with a toast.
 *
 * Props: t, companyId, appointmentId, locationId (current, "" = none),
 * locations (all of the company), onSaved(locationId), warnWhenEmpty,
 * notifiesCustomer (the customer gets an email), disabled.
 */
export default function AppointmentLocationEditor({
  t,
  companyId,
  appointmentId,
  locationId = "",
  locations = [],
  onSaved,
  warnWhenEmpty = false,
  notifiesCustomer = false,
  disabled = false,
}) {
  const tr = (key, fallback, values = {}) => {
    try {
      const text = t ? t(key, { defaultValue: fallback, ...values }) : fallback;
      return !text || text === key ? fallback.replace(/{{\s*(\w+)\s*}}/g, (all, name) => values[name] ?? all) : text;
    } catch {
      return fallback;
    }
  };
  const current = String(locationId || "");
  const [value, setValue] = useState(current);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setValue(current);
  }, [current, appointmentId]);

  const options = locations.filter((location) => location.active || location.locationId === current);
  const changed = value !== current;

  const save = async () => {
    if (!changed || saving) return;
    setSaving(true);
    try {
      const result = await locationsService.setAppointmentLocation({
        companyId,
        appointmentId,
        locationId: value,
      });
      toast.success(
        notifiesCustomer
          ? tr(
              "locations.appointmentEditor.savedNotified",
              "Location saved. The customer gets an email with the change.",
            )
          : tr("locations.appointmentEditor.saved", "Location saved."),
      );
      const others = Number(result?.otherLocationCount) || 0;
      if (others > 0) {
        toast.warning(
          tr(
            "locations.appointmentEditor.otherLocation",
            "Heads up: at this time you already have {{count}} appointment(s) in another location.",
            { count: others },
          ),
        );
      }
      if (onSaved) onSaved(value);
    } catch (error) {
      toast.error(error?.message || tr("locations.appointmentEditor.error", "The location could not be saved."));
    } finally {
      setSaving(false);
    }
  };

  const fieldId = `appointment-location-${appointmentId}`;
  return (
    <div className="appointment-location-editor">
      <label htmlFor={fieldId}>
        <FaLocationDot aria-hidden="true" />
        {tr("locations.appointmentEditor.label", "Location")}
      </label>
      <div className="appointment-location-editor__row">
        <select
          id={fieldId}
          value={value}
          disabled={disabled || saving}
          onChange={(event) => setValue(event.target.value)}
        >
          <option value="">{tr("locations.appointmentEditor.noLocation", "No location")}</option>
          {options.map((location) => (
            <option key={location.locationId} value={location.locationId}>
              {location.name}
              {location.active ? "" : ` (${tr("locations.appointmentEditor.disabled", "disabled")})`}
            </option>
          ))}
        </select>
        <button type="button" onClick={save} disabled={disabled || saving || !changed}>
          <FaFloppyDisk aria-hidden="true" />
          {saving
            ? tr("locations.appointmentEditor.saving", "Saving…")
            : tr("locations.appointmentEditor.save", "Save location")}
        </button>
      </div>
      {warnWhenEmpty && !current && (
        <p className="appointment-location-editor__warning" role="note">
          <FaTriangleExclamation aria-hidden="true" />
          {tr(
            "locations.appointmentEditor.missing",
            "This request has no location yet. Choose it before approving.",
          )}
        </p>
      )}
    </div>
  );
}
