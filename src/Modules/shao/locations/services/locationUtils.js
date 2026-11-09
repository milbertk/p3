// Helpers for company locations ("Sedes", 2026-11-07). No map key needed:
// the point is read from a pasted Google Maps link or from the browser
// (GPS), and "Open in Maps" opens Google Maps.

const MAPS_SEARCH = "https://www.google.com/maps/search/?api=1&query=";

/** Value of the location field for "Customer chooses (any active location)". */
export const CUSTOMER_CHOOSES = "__customer_chooses__";

function validPoint(latitude, longitude) {
  const lat = Number(latitude);
  const lng = Number(longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  if (lat === 0 && lng === 0) return null;
  return { latitude: roundCoordinate(lat), longitude: roundCoordinate(lng) };
}

/** 6 decimals (about 10 cm), like the database. */
export function roundCoordinate(value) {
  return Math.round(Number(value) * 1e6) / 1e6;
}

const NUMBER = "(-?\\d{1,3}(?:\\.\\d+)?)";
const PAIR = new RegExp(`${NUMBER}\\s*,\\s*${NUMBER}`);

/**
 * Reads the map point from what the user pasted:
 *   - a Google Maps link: ".../place/Name/@9.998,-84.117,17z/data=...!3d9.998!4d-84.117",
 *     "...?q=9.998,-84.117", "...?query=", "?ll=", "?destination=", "?center="
 *   - "geo:9.998,-84.117" or just "9.998, -84.117".
 * Returns { latitude, longitude }, { shortLink: true } for short links
 * (maps.app.goo.gl / goo.gl/maps: they do not carry the point), or null.
 */
export function parseMapsLink(text) {
  let value = String(text || "").trim();
  if (!value) return null;
  try {
    value = decodeURIComponent(value.replace(/\+/g, " "));
  } catch {
    // keep the text as it is
  }

  if (/^(https?:\/\/)?(maps\.app\.goo\.gl|goo\.gl\/maps)\//i.test(value)) {
    return { shortLink: true };
  }

  // The pin of a place (more exact than the map center "@").
  const pin = value.match(/!3d(-?\d{1,3}(?:\.\d+)?)!4d(-?\d{1,3}(?:\.\d+)?)/);
  if (pin) {
    const point = validPoint(pin[1], pin[2]);
    if (point) return point;
  }

  const at = value.match(new RegExp(`@${NUMBER},${NUMBER}`));
  if (at) {
    const point = validPoint(at[1], at[2]);
    if (point) return point;
  }

  const param = value.match(
    new RegExp(`[?&](?:q|query|ll|destination|center|daddr|sll)=(?:loc:)?\\s*${NUMBER}\\s*,\\s*${NUMBER}`, "i"),
  );
  if (param) {
    const point = validPoint(param[1], param[2]);
    if (point) return point;
  }

  const geo = value.match(new RegExp(`^geo:${NUMBER},${NUMBER}`, "i"));
  if (geo) return validPoint(geo[1], geo[2]);

  // Only coordinates (e.g. copied from the map): "9.998, -84.117".
  if (/^\s*-?\d/.test(value) && !/[a-z]/i.test(value)) {
    const pair = value.match(PAIR);
    if (pair) return validPoint(pair[1], pair[2]);
  }
  return null;
}

/** "Open in Maps" link of a location ("" when it has no point and no address). */
export function mapsUrl(location) {
  const lat = location?.latitude;
  const lng = location?.longitude;
  if (lat !== null && lat !== undefined && lng !== null && lng !== undefined && lat !== "" && lng !== "") {
    const point = validPoint(lat, lng);
    if (point) return `${MAPS_SEARCH}${point.latitude.toFixed(6)},${point.longitude.toFixed(6)}`;
  }
  const address = String(location?.address || "").trim();
  return address ? MAPS_SEARCH + encodeURIComponent(address).replace(/%20/g, "+") : "";
}

/** Short text of a location: "Heredia — 100 m norte del parque". */
export function locationLabel(location) {
  if (!location) return "";
  const name = String(location.name || location.locationName || "").trim();
  const address = String(location.address || location.locationAddress || "").trim();
  return address ? `${name} — ${address}` : name;
}

/** Locations by id (lower case). */
export function locationsById(list) {
  const map = {};
  (Array.isArray(list) ? list : []).forEach((location) => {
    const id = String(location?.locationId || "").toLowerCase();
    if (id) map[id] = location;
  });
  return map;
}

const DAY_ENUMS = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"];

function translate(t, key, fallback, options = {}) {
  try {
    if (typeof t !== "function") return fallback;
    const value = t(key, { defaultValue: fallback, ...options });
    return !value || value === key ? fallback : value;
  } catch {
    return fallback;
  }
}

function fill(text, values) {
  return String(text).replace(/{{\s*(\w+)\s*}}/g, (_, key) => (values[key] !== undefined ? values[key] : ""));
}

/**
 * One clash of hours as a sentence in the user's language, e.g.
 * "Monday 10:00–12:00 is already in Heredia (Consultation)".
 */
export function overlapMessage(t, overlap) {
  if (!overlap) return "";
  const day = String(overlap.otherDayOfWeek || "").toUpperCase();
  let when = overlap.otherDate || "";
  if (DAY_ENUMS.includes(day)) {
    const key = day.toLowerCase();
    when = translate(t, `bookingAvailabilityMaintenance.days.${key}.long`, key.charAt(0).toUpperCase() + key.slice(1));
  }
  const hours =
    overlap.otherAllDay || !overlap.otherStartTime
      ? translate(t, "locations.overlap.allDay", "(all day)")
      : `${overlap.otherStartTime}–${overlap.otherEndTime}`;
  const values = {
    when: `${when} ${hours}`.trim(),
    location: overlap.otherCustomerChoice
      ? translate(t, "locations.overlap.customerChooses", "the location the customer chooses")
      : overlap.otherLocationName || "",
    schedule: overlap.otherScheduleName || "",
  };
  const template = translate(t, "locations.overlap.sentence", "{{when}} is already in {{location}} ({{schedule}})", values);
  return fill(template, values);
}

/** The clashes of a failed save (409 LOCATION_OVERLAP), or []. */
export function overlapsFromError(error) {
  const result = error?.response?.result;
  if (error?.status === 409 && result?.code === "LOCATION_OVERLAP" && Array.isArray(result.overlaps)) {
    return result.overlaps;
  }
  return [];
}
