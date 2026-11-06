import { APIShao, Showcaselink } from "./globalVar";

// Store address helpers (company slug). The rules must stay in sync with
// bussunessLedger/blpageconfiguration/bSlug.go in shao.

export const SLUG_MIN_LENGTH = 3;
export const SLUG_MAX_LENGTH = 60;

const RESERVED_SLUGS = new Set([
  "admin", "api", "app", "assets", "companies", "health", "help", "login",
  "logout", "public", "r", "register", "s", "service", "shao", "showcase",
  "static", "store", "support", "privacy", "terms", "www",
]);

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/** "Maderas Finas Ñandú" -> "maderas-finas-nandu" */
export function normalizeSlug(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // accents
    .replace(/[\s._-]+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, SLUG_MAX_LENGTH)
    .replace(/-$/, "");
}

/**
 * Returns "" when the slug is valid (or empty = not used), otherwise an error
 * key: "short" | "format" | "reserved" | "uuid".
 */
export function slugProblem(slug) {
  if (!slug) return "";
  if (slug.length < SLUG_MIN_LENGTH || slug.length > SLUG_MAX_LENGTH) return "short";
  if (!SLUG_PATTERN.test(slug)) return "format";
  if (RESERVED_SLUGS.has(slug)) return "reserved";
  if (UUID_PATTERN.test(slug)) return "uuid";
  return "";
}

/** The key used in links: the slug when the company has one, else its id. */
export function storeKey({ slug, companyId }) {
  return String(slug || "").trim() || String(companyId || "").trim();
}

/** Direct store address, e.g. http://…:3001/maderas-finas */
export function buildStoreUrl(key) {
  if (!key) return "";
  return `${String(Showcaselink || "").replace(/\/$/, "")}/${encodeURIComponent(key)}`;
}

/**
 * Share address with preview (title, image) for WhatsApp / Facebook, served
 * by shao: http://…:8081/s/maderas-finas. It opens the store right away.
 */
export function buildShareUrl(key) {
  if (!key) return "";
  return `${String(APIShao || "").replace(/\/$/, "")}/s/${encodeURIComponent(key)}`;
}
