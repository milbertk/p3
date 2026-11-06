// Login buttons and legal legend (2026-10-26).
// Each sign-in button is controlled from .env / .env.production (see env.example.NEW.txt):
//   active = the button works normally
//   soon   = the button is shown with a "coming soon" label; clicking it only
//            shows a message, the provider's login code is NOT called
//   hidden = the button is not shown
// Missing variable  -> "active" (the rule).
// Misspelled value  -> "hidden" (safer than turning on a provider by mistake).
// Remember: values are fixed at build time; restart `npm start` / rebuild after a change.

export const AUTH_STATES = { ACTIVE: "active", SOON: "soon", HIDDEN: "hidden" };

// Static references: Create React App replaces process.env.REACT_APP_* at build time.
const RAW_FLAGS = {
  google: process.env.REACT_APP_AUTH_GOOGLE,
  email: process.env.REACT_APP_AUTH_EMAIL,
  microsoft: process.env.REACT_APP_AUTH_MICROSOFT,
  facebook: process.env.REACT_APP_AUTH_FACEBOOK,
  apple: process.env.REACT_APP_AUTH_APPLE,
};

/** State of one provider: "active" | "soon" | "hidden". Name is case-insensitive ("Google", "google"). */
export function authProviderState(name) {
  const key = String(name || "").toLowerCase();
  const raw = RAW_FLAGS[key];
  if (raw === undefined || String(raw).trim() === "") return AUTH_STATES.ACTIVE;
  const value = String(raw).trim().toLowerCase();
  if (Object.values(AUTH_STATES).includes(value)) return value;
  console.warn(`REACT_APP_AUTH_${key.toUpperCase()}="${raw}" is not valid (use active, soon or hidden). The button is hidden.`);
  return AUTH_STATES.HIDDEN;
}

/** Message for a "soon" button (REACT_APP_AUTH_SOON_MESSAGE, or the default in the user's language). */
export function authSoonMessage(lang) {
  const custom = process.env.REACT_APP_AUTH_SOON_MESSAGE;
  if (custom && String(custom).trim()) return String(custom).trim();
  return String(lang || "").toLowerCase().startsWith("es")
    ? "Este inicio de sesión estará disponible pronto."
    : "This sign-in option will be available soon.";
}

/** "Próximamente" / "Coming soon" label shown on the button. */
export function authSoonLabel(lang) {
  return String(lang || "").toLowerCase().startsWith("es") ? "Próximamente" : "Coming soon";
}

// Legal legend under "Powered by Kuantum K" (every page).
const envText = (value, fallback) => (value && String(value).trim() ? String(value).trim() : fallback);

export const LEGAL = {
  owner: envText(process.env.REACT_APP_LEGAL_OWNER, "Quantum Systems and General Services S.A."),
  id: envText(process.env.REACT_APP_LEGAL_ID, "3-101-789271"),
  url: envText(process.env.REACT_APP_LEGAL_URL, "https://www.kuantumk.com"),
};

/** Legend text in Spanish or English. */
export function legalNotice(lang) {
  return String(lang || "").toLowerCase().startsWith("es")
    ? `AlephK y Kuantum K son marcas de ${LEGAL.owner}, sociedad registrada en Costa Rica · Cédula jurídica ${LEGAL.id}`
    : `AlephK and Kuantum K are brands of ${LEGAL.owner}, a company registered in Costa Rica · Corporate ID ${LEGAL.id}`;
}
