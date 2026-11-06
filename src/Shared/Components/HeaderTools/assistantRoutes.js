// Screens the AI assistant can link to. The backend tells Claude to write
// these paths in square brackets, e.g. [/shao/orders]; the chat turns them
// into buttons. Labels reuse the sidebar translation keys.
export const ASSISTANT_ROUTES = {
  "/shao": "sidebar.home",
  "/shao/products": "sidebar.products",
  "/shao/categories": "sidebar.category",
  "/shao/web-orders": "sidebar.aprovala",
  "/shao/orders": "sidebar.order",
  "/shao/order-tracking": "sidebar.trackingord",
  "/shao/order-stages": "sidebar.trackingm",
  "/shao/booking-schedules": "sidebar.booking",
  "/shao/booking-requests": "sidebar.aprovalb",
  "/shao/appointments": "sidebar.appointments",
  "/shao/book-for-customer": "sidebar.selfbooking",
  "/shao/customers": "sidebar.customers",
  "/shao/page-configuration": "sidebar.pageConfiguration",
  "/shao/reports": "sidebar.reports",
  "/shao/team": "sidebar.usersbcompany",
};

// Old paths (from earlier conversations) still become buttons, pointing to
// the new screen.
const OLD_ASSISTANT_PATHS = {
  "/shao/customersadd": "/shao/customers",
  "/shao/category": "/shao/categories",
  "/shao/trackingmant": "/shao/order-stages",
  "/shao/oporders": "/shao/order-tracking",
  "/shao/usersbcompany": "/shao/team",
  "/shao/maintenancebooking": "/shao/booking-schedules",
  "/shao/aprovalb": "/shao/booking-requests",
  "/shao/approvala": "/shao/web-orders",
  "/shao/selfbooking": "/shao/book-for-customer",
};

const PATH_IN_BRACKETS = /\[(\/[^\]\s]+)\]/g;

function findRoute(path) {
  const lower = String(path).toLowerCase();
  const oldPath = Object.keys(OLD_ASSISTANT_PATHS).find((known) => known.toLowerCase() === lower);
  const target = oldPath ? OLD_ASSISTANT_PATHS[oldPath].toLowerCase() : lower;
  return Object.keys(ASSISTANT_ROUTES).find((known) => known.toLowerCase() === target);
}

/**
 * Splits an assistant reply into clean text plus link buttons.
 * Known [/paths] become buttons; unknown ones are removed from the text.
 * @returns {{ text: string, links: {path: string, label: string}[] }}
 */
export function buildReply(rawText, t) {
  const links = [];
  const seen = new Set();

  const text = String(rawText || "")
    .replace(PATH_IN_BRACKETS, (_, path) => {
      const route = findRoute(path);
      if (route && !seen.has(route)) {
        seen.add(route);
        links.push({ path: route, label: t(ASSISTANT_ROUTES[route]) });
      }
      return "";
    })
    .replace(/[ \t]+([.,;:])/g, "$1")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\(\s*\)/g, "")
    .trim();

  return { text, links };
}

// Suggested questions shown as quick chips.
export const SUGGESTION_KEYS = [
  "aiAssistant.suggestions.createOrder",
  "aiAssistant.suggestions.createAppointment",
  "aiAssistant.suggestions.changeLogo",
  "aiAssistant.suggestions.reports",
];
