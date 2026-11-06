// Company time zones (2026-11-04).
// The backend saves the IANA name (e.g. "America/New_York"), so summer time
// is applied automatically; the screens show the GMT offset, e.g.
// "(GMT−05:00 / −04:00 in summer) New York". Default: Costa Rica (GMT−6).
// The same list is used by the showcase (copy kept in sync by hand).

export const DEFAULT_TIME_ZONE = "America/Costa_Rica";
export const TIME_ZONE_LABEL_MAX_LENGTH = 60;

// Main zones of the world, west to east. en / es = place names.
export const TIME_ZONES = [
  { zone: "Pacific/Honolulu", en: "Hawaii", es: "Hawái" },
  { zone: "America/Anchorage", en: "Alaska", es: "Alaska" },
  { zone: "America/Los_Angeles", en: "Los Angeles (US Pacific)", es: "Los Ángeles (Pacífico de EE. UU.)" },
  { zone: "America/Phoenix", en: "Phoenix (Arizona)", es: "Phoenix (Arizona)" },
  { zone: "America/Denver", en: "Denver (US Mountain)", es: "Denver (Montaña de EE. UU.)" },
  { zone: "America/Chicago", en: "Chicago (US Central)", es: "Chicago (Centro de EE. UU.)" },
  { zone: "America/Mexico_City", en: "Mexico City", es: "Ciudad de México" },
  { zone: "America/Guatemala", en: "Guatemala", es: "Guatemala" },
  { zone: "America/El_Salvador", en: "El Salvador", es: "El Salvador" },
  { zone: "America/Tegucigalpa", en: "Honduras", es: "Honduras" },
  { zone: "America/Managua", en: "Nicaragua", es: "Nicaragua" },
  { zone: "America/Costa_Rica", en: "Costa Rica", es: "Costa Rica" },
  { zone: "America/Panama", en: "Panama", es: "Panamá" },
  { zone: "America/Bogota", en: "Bogotá (Colombia)", es: "Bogotá (Colombia)" },
  { zone: "America/Lima", en: "Lima (Peru)", es: "Lima (Perú)" },
  { zone: "America/Guayaquil", en: "Ecuador", es: "Ecuador" },
  { zone: "America/New_York", en: "New York (US Eastern)", es: "Nueva York (Este de EE. UU.)" },
  { zone: "America/Toronto", en: "Toronto (Canada)", es: "Toronto (Canadá)" },
  { zone: "America/Havana", en: "Havana (Cuba)", es: "La Habana (Cuba)" },
  { zone: "America/Santo_Domingo", en: "Dominican Republic", es: "República Dominicana" },
  { zone: "America/Puerto_Rico", en: "Puerto Rico", es: "Puerto Rico" },
  { zone: "America/Caracas", en: "Caracas (Venezuela)", es: "Caracas (Venezuela)" },
  { zone: "America/La_Paz", en: "La Paz (Bolivia)", es: "La Paz (Bolivia)" },
  { zone: "America/Santiago", en: "Santiago (Chile)", es: "Santiago (Chile)" },
  { zone: "America/Asuncion", en: "Asunción (Paraguay)", es: "Asunción (Paraguay)" },
  { zone: "America/Argentina/Buenos_Aires", en: "Buenos Aires (Argentina)", es: "Buenos Aires (Argentina)" },
  { zone: "America/Montevideo", en: "Montevideo (Uruguay)", es: "Montevideo (Uruguay)" },
  { zone: "America/Sao_Paulo", en: "São Paulo (Brazil)", es: "São Paulo (Brasil)" },
  { zone: "Atlantic/Canary", en: "Canary Islands", es: "Islas Canarias" },
  { zone: "UTC", en: "UTC (no offset)", es: "UTC (sin diferencia)" },
  { zone: "Europe/London", en: "London (UK)", es: "Londres (Reino Unido)" },
  { zone: "Europe/Lisbon", en: "Lisbon (Portugal)", es: "Lisboa (Portugal)" },
  { zone: "Europe/Madrid", en: "Madrid (Spain)", es: "Madrid (España)" },
  { zone: "Europe/Paris", en: "Paris (France)", es: "París (Francia)" },
  { zone: "Europe/Berlin", en: "Berlin (Germany)", es: "Berlín (Alemania)" },
  { zone: "Europe/Rome", en: "Rome (Italy)", es: "Roma (Italia)" },
  { zone: "Africa/Johannesburg", en: "Johannesburg (South Africa)", es: "Johannesburgo (Sudáfrica)" },
  { zone: "Africa/Cairo", en: "Cairo (Egypt)", es: "El Cairo (Egipto)" },
  { zone: "Europe/Moscow", en: "Moscow (Russia)", es: "Moscú (Rusia)" },
  { zone: "Asia/Dubai", en: "Dubai (UAE)", es: "Dubái (EAU)" },
  { zone: "Asia/Kolkata", en: "India", es: "India" },
  { zone: "Asia/Bangkok", en: "Bangkok (Thailand)", es: "Bangkok (Tailandia)" },
  { zone: "Asia/Shanghai", en: "China", es: "China" },
  { zone: "Asia/Singapore", en: "Singapore", es: "Singapur" },
  { zone: "Asia/Tokyo", en: "Tokyo (Japan)", es: "Tokio (Japón)" },
  { zone: "Australia/Sydney", en: "Sydney (Australia)", es: "Sídney (Australia)" },
  { zone: "Pacific/Auckland", en: "Auckland (New Zealand)", es: "Auckland (Nueva Zelanda)" },
];

// isValidTimeZone: the browser knows the zone name.
export function isValidTimeZone(zone) {
  if (!zone) return false;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: zone });
    return true;
  } catch {
    return false;
  }
}

// browserTimeZone: the zone of this computer or phone ("" when unknown).
export function browserTimeZone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "";
  } catch {
    return "";
  }
}

// offsetMinutes: minutes from UTC of a zone at a moment (−360 = GMT−6).
export function offsetMinutes(zone, date = new Date()) {
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: zone,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }).formatToParts(date);
    const get = (type) => Number(parts.find((p) => p.type === type)?.value || 0);
    const asUTC = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
    return Math.round((asUTC - Math.floor(date.getTime() / 1000) * 1000) / 60000);
  } catch {
    return 0;
  }
}

// formatOffset: −360 -> "GMT−06:00", 330 -> "GMT+05:30", 0 -> "GMT".
export function formatOffset(minutes, { short = false } = {}) {
  if (!minutes) return "GMT";
  const sign = minutes < 0 ? "−" : "+";
  const abs = Math.abs(minutes);
  const hours = Math.floor(abs / 60);
  const mins = abs % 60;
  if (short) return `GMT${sign}${hours}${mins ? `:${String(mins).padStart(2, "0")}` : ""}`;
  return `GMT${sign}${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
}

// Winter and summer offsets of the current year (same value = no summer time).
export function zoneOffsets(zone, year = new Date().getFullYear()) {
  const january = offsetMinutes(zone, new Date(Date.UTC(year, 0, 15, 12)));
  const july = offsetMinutes(zone, new Date(Date.UTC(year, 6, 15, 12)));
  return { standard: Math.min(january, july), summer: Math.max(january, july) };
}

// placeName: the place of a zone in the language ("es" or "en"); unknown
// zones use the last part of the name ("America/Costa_Rica" -> "Costa Rica").
export function placeName(zone, language = "en") {
  const item = TIME_ZONES.find((z) => z.zone === zone);
  if (item) return String(language).toLowerCase().startsWith("es") ? item.es : item.en;
  const last = String(zone || "").split("/").pop() || "";
  return last.replace(/_/g, " ");
}

// zoneOptionLabel: "(GMT−06:00) Costa Rica" or
// "(GMT−05:00 / −04:00 summer) New York (US Eastern)".
export function zoneOptionLabel(zone, language = "en", summerWord = "summer") {
  const { standard, summer } = zoneOffsets(zone);
  const main = formatOffset(standard);
  const extra = summer !== standard ? ` / ${formatOffset(summer).replace("GMT", "")} ${summerWord}` : "";
  return `(${main}${extra}) ${placeName(zone, language)}`;
}

// sortedTimeZones: the list plus the given zones (the saved one, the one of
// this computer) when they are not in the list, ordered by winter offset.
export function sortedTimeZones(...extraZones) {
  const list = [...TIME_ZONES];
  extraZones.forEach((extra) => {
    if (extra && !list.some((z) => z.zone === extra) && isValidTimeZone(extra)) {
      list.push({ zone: extra, en: placeName(extra), es: placeName(extra) });
    }
  });
  return list
    .map((z) => ({ ...z, offset: zoneOffsets(z.zone).standard }))
    .sort((a, b) => a.offset - b.offset || a.en.localeCompare(b.en));
}

// todayInZone: "YYYY-MM-DD" of a zone now (the company's "today").
export function todayInZone(zone, date = new Date()) {
  try {
    return new Intl.DateTimeFormat("en-CA", { timeZone: zone, year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
  } catch {
    const pad = (n) => String(n).padStart(2, "0");
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  }
}

// timeInZone: "14:05" of a zone now.
export function timeInZone(zone, date = new Date()) {
  try {
    return new Intl.DateTimeFormat("en-GB", { timeZone: zone, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(date);
  } catch {
    return "";
  }
}

// zonedDateTime: the moment of a company date + hour ("2026-07-10", "09:00")
// in its zone, as a Date (to show it in the visitor's own time).
export function zonedDateTime(dateKey, hhmm, zone) {
  const [y, m, d] = String(dateKey).split("-").map(Number);
  const [hh, mm] = String(hhmm || "00:00").split(":").map(Number);
  if (!y || !m || !d) return null;
  const guess = Date.UTC(y, m - 1, d, hh || 0, mm || 0);
  let offset = offsetMinutes(zone, new Date(guess));
  let result = guess - offset * 60000;
  // second pass: the offset may differ at the real moment (summer time change)
  offset = offsetMinutes(zone, new Date(result));
  result = guess - offset * 60000;
  return new Date(result);
}
