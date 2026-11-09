import { APIShao } from "../../../../Shared/Utils/globalVar";

/**
 * Company locations ("Sedes", 2026-11-07).
 *
 *   GET    {APIShao}/companies/{companyId}/locations[?includeInactive=true]
 *   GET    {APIShao}/companies/{companyId}/locations/{locationId}
 *   POST   {APIShao}/companies/{companyId}/locations                      (create / update)
 *   DELETE {APIShao}/companies/{companyId}/locations/{locationId}         (a used one is disabled)
 *   PUT    {APIShao}/companies/{companyId}/locations/{locationId}/active  { active }
 *   GET    {APIShao}/companies/{companyId}/booking-settings
 *   PUT    {APIShao}/companies/{companyId}/booking-settings               { locationsEnabled?, locationsSameTime? }
 *   PUT    {APIShao}/companies/{companyId}/appointments/{id}/location     { locationId } (2026-11-08)
 *
 * Errors are LocationsServiceError with `status` and `response` (the JSON
 * answer). A clash of hours answers 409 with
 * response.result = { code: "LOCATION_OVERLAP", overlaps: [...] }.
 */
export class LocationsServiceError extends Error {
  constructor(message, { status, response } = {}) {
    super(message);
    this.name = "LocationsServiceError";
    this.status = status;
    this.response = response;
  }
}

export default class LocationsService {
  constructor(baseUrl = APIShao) {
    this.baseUrl = String(baseUrl || "").replace(/\/$/, "");
  }

  companyUrl(companyId, suffix = "") {
    const id = String(companyId || "").trim();
    if (!id) throw new TypeError("The selected company ID is required.");
    return `${this.baseUrl}/companies/${encodeURIComponent(id)}${suffix}`;
  }

  locationUrl(companyId, locationId, suffix = "") {
    const id = String(locationId || "").trim();
    if (!id) throw new TypeError("The location ID is required.");
    return this.companyUrl(companyId, `/locations/${encodeURIComponent(id)}${suffix}`);
  }

  async request(url, { method = "GET", body, signal } = {}) {
    let response;
    try {
      response = await fetch(url, {
        method,
        credentials: "include",
        headers: body
          ? { Accept: "application/json", "Content-Type": "application/json" }
          : { Accept: "application/json" },
        body: body ? JSON.stringify(body) : undefined,
        signal,
      });
    } catch (error) {
      if (error?.name === "AbortError") throw error;
      throw new LocationsServiceError("Could not connect to the server.", { status: 0, response: null });
    }
    const data = await readJson(response);
    if (!response.ok) {
      throw new LocationsServiceError(data?.message || `Error ${response.status}`, {
        status: response.status,
        response: data,
      });
    }
    return data;
  }

  /** Locations of the company (with usage). Resolves to an array. */
  async list({ companyId, includeInactive = false, signal } = {}) {
    const query = includeInactive ? "?includeInactive=true" : "";
    const data = await this.request(this.companyUrl(companyId, `/locations${query}`), { signal });
    return Array.isArray(data?.result) ? data.result : [];
  }

  async select({ companyId, locationId, signal } = {}) {
    const data = await this.request(this.locationUrl(companyId, locationId), { signal });
    return data?.result || null;
  }

  /** Creates (no locationId) or updates one location. Resolves to the saved one. */
  async save({ companyId, location } = {}) {
    if (!location || typeof location !== "object") {
      throw new TypeError("The location object is required.");
    }
    const data = await this.request(this.companyUrl(companyId, "/locations"), {
      method: "POST",
      body: location,
    });
    return data?.result || null;
  }

  /** Resolves to { deleted, disabled, usage } and the server message. */
  async remove({ companyId, locationId } = {}) {
    const data = await this.request(this.locationUrl(companyId, locationId), { method: "DELETE" });
    return { ...(data?.result || {}), message: data?.message || "" };
  }

  /** Resolves to { location, futureAppointments }. */
  async setActive({ companyId, locationId, active } = {}) {
    const data = await this.request(this.locationUrl(companyId, locationId, "/active"), {
      method: "PUT",
      body: { active: Boolean(active) },
    });
    return data?.result || null;
  }

  /** Resolves to { locationsEnabled, locationsSameTime } (2026-11-08). */
  async getSettings({ companyId, signal } = {}) {
    const data = await this.request(this.companyUrl(companyId, "/booking-settings"), { signal });
    return data?.result || { locationsEnabled: false, locationsSameTime: false };
  }

  /** Saves one or both switches; a switch not given keeps its value. */
  async saveSettings({ companyId, locationsEnabled, locationsSameTime } = {}) {
    const body = {};
    if (locationsEnabled !== undefined) body.locationsEnabled = Boolean(locationsEnabled);
    if (locationsSameTime !== undefined) body.locationsSameTime = Boolean(locationsSameTime);
    const data = await this.request(this.companyUrl(companyId, "/booking-settings"), {
      method: "PUT",
      body,
    });
    return data?.result || null;
  }

  /**
   * Changes only the location of an appointment or booking request
   * (2026-11-08): PUT {APIShao}/companies/{companyId}/appointments/{id}/location
   * { locationId } ("" = no location). Resolves to { appointment,
   * otherLocationCount }.
   */
  async setAppointmentLocation({ companyId, appointmentId, locationId } = {}) {
    const id = String(appointmentId || "").trim();
    if (!id) throw new TypeError("The appointment ID is required.");
    const data = await this.request(
      this.companyUrl(companyId, `/appointments/${encodeURIComponent(id)}/location`),
      { method: "PUT", body: { locationId: String(locationId || "") } },
    );
    return data?.result || null;
  }

  /**
   * For the screens that show a location field (2026-11-08): resolves to
   * { enabled, sameTime, locations }. enabled = the company turned on "We
   * use locations"; sameTime = "We can attend in more than one location at
   * the same time". When off (or on any error) the screens show no location.
   */
  async forForms({ companyId, signal } = {}) {
    try {
      const settings = await this.getSettings({ companyId, signal });
      if (!settings?.locationsEnabled) return { enabled: false, sameTime: false, locations: [] };
      const locations = await this.list({ companyId, includeInactive: true, signal });
      return { enabled: true, sameTime: Boolean(settings.locationsSameTime), locations };
    } catch (error) {
      if (error?.name === "AbortError") throw error;
      return { enabled: false, sameTime: false, locations: [] };
    }
  }
}

async function readJson(response) {
  const text = await response.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return { message: text };
  }
}
