// MOCK assistant: answers from keywords and fake data, only to preview the
// chat experience. It will be replaced by a backend call to an AI model that
// knows the app (help questions) and can query the API (reports).

// Where each feature lives. Labels reuse the sidebar translation keys.
const ROUTES = {
  appointments: { path: "/shao/appointments", labelKey: "sidebar.appointments" },
  selfBooking: { path: "/shao/selfbooking", labelKey: "sidebar.selfbooking" },
  orders: { path: "/shao/orders", labelKey: "sidebar.order" },
  operationalTracking: { path: "/shao/oporders", labelKey: "sidebar.trackingord" },
  customers: { path: "/shao/customersadd", labelKey: "sidebar.customers" },
  products: { path: "/shao/products", labelKey: "sidebar.products" },
  category: { path: "/shao/category", labelKey: "sidebar.category" },
  reports: { path: "/shao/Reports", labelKey: "sidebar.reports" },
  pageConfiguration: { path: "/shao/page-configuration", labelKey: "sidebar.pageConfiguration" },
  usersAndPermissions: { path: "/shao/usersbcompany", labelKey: "sidebar.usersbcompany" },
  bookingAvailability: { path: "/shao/maintenancebooking", labelKey: "sidebar.booking" },
  webOrderApproval: { path: "/shao/approvala", labelKey: "sidebar.aprovala" },
  bookingRequests: { path: "/shao/aprovalb", labelKey: "sidebar.aprovalb" },
};

const MOCK_APPOINTMENTS = [
  { hour: 9, minute: 0, customer: "Laura Gómez", service: "Consultation" },
  { hour: 11, minute: 30, customer: "Carlos Ruiz", service: "Product fitting" },
  { hour: 15, minute: 0, customer: "Ana Torres", service: "Follow-up" },
  { hour: 18, minute: 0, customer: "Miguel Herrera", service: "Custom engraving review" },
  { hour: 19, minute: 30, customer: "Sofía Castro", service: "Delivery pickup" },
];

const MOCK_PENDING_ORDERS = [
  { code: "ORD-1042", customer: "Daniela Ríos", status: "inProgress", dueInDays: 0 },
  { code: "ORD-1045", customer: "Jorge Méndez", status: "placed", dueInDays: 1 },
  { code: "ORD-1047", customer: "Valeria Paz", status: "partialDone", dueInDays: 2 },
  { code: "ORD-1051", customer: "Luis Ortega", status: "placed", dueInDays: 4 },
];

// Intents are checked in order; the first one whose groups all match wins.
// Each group is a list of alternative keywords (English and Spanish).
const INTENTS = [
  {
    id: "appointmentsToday",
    match: [["appointment", "cita", "agenda"], ["today", "hoy", "evening", "tarde", "noche", "tonight", "now", "momento", "ahora"]],
  },
  { id: "pendingOrders", match: [["order", "orden", "pedido"], ["pending", "next", "pendiente", "próxima", "proxima", "accomplish", "cumplir", "list", "lista"]] },
  { id: "createAppointment", match: [["appointment", "cita", "booking", "reserva"]] },
  { id: "createOrder", match: [["order", "orden", "pedido"]] },
  { id: "customers", match: [["customer", "client"]] },
  { id: "products", match: [["product", "producto", "service", "servicio"]] },
  { id: "category", match: [["category", "categor"]] },
  { id: "reports", match: [["report", "reporte", "sales", "venta", "revenue", "ingreso"]] },
  { id: "pageConfiguration", match: [["logo", "header", "encabezado", "showcase", "page", "página", "pagina", "vitrina"]] },
  { id: "usersAndPermissions", match: [["user", "usuario", "permission", "permiso"]] },
];

// Splits the question into lowercase words. A keyword matches a word that
// starts with it ("appointment" matches "appointments"), so "cita" does not
// match inside "solicitar".
// Accents are ignored, so "órdenes" matches "orden".
function stripAccents(text) {
  return String(text || "").toLowerCase().normalize("NFD").replace(/\p{M}/gu, "");
}

function toWords(text) {
  return stripAccents(text).split(/[^\p{L}\p{N}]+/u).filter(Boolean);
}

function hasKeyword(words, keywords) {
  return keywords.some((keyword) => {
    const normalized = stripAccents(keyword);
    return words.some((word) => word.startsWith(normalized));
  });
}

function detectIntent(words) {
  const intent = INTENTS.find((candidate) =>
    candidate.match.every((group) => hasKeyword(words, group)),
  );
  return intent?.id || "fallback";
}

function link(t, routeKey) {
  const route = ROUTES[routeKey];
  return { path: route.path, label: t(route.labelKey) };
}

function formatTime(hour, minute, locale) {
  const date = new Date();
  date.setHours(hour, minute, 0, 0);
  return date.toLocaleTimeString(locale, { hour: "numeric", minute: "2-digit" });
}

function formatDueDate(daysFromToday, locale) {
  const date = new Date();
  date.setDate(date.getDate() + daysFromToday);
  return date.toLocaleDateString(locale, { weekday: "short", day: "numeric", month: "short" });
}

/**
 * Builds the mock answer for a question.
 * @returns {{ text: string, links?: {path,label}[], items?: {title,subtitle,meta}[] }}
 */
export function answerQuestion(question, t, locale) {
  const words = toWords(question);
  const intent = detectIntent(words);

  if (intent === "appointmentsToday") {
    const eveningOnly = hasKeyword(words, ["evening", "tarde", "noche", "tonight"]);
    const appointments = MOCK_APPOINTMENTS.filter((item) => !eveningOnly || item.hour >= 15);
    return {
      text: t(eveningOnly ? "aiAssistant.mock.appointmentsEvening" : "aiAssistant.mock.appointmentsToday", {
        count: appointments.length,
      }),
      items: appointments.map((item) => ({
        title: item.customer,
        subtitle: item.service,
        meta: formatTime(item.hour, item.minute, locale),
      })),
      links: [link(t, "appointments")],
    };
  }

  if (intent === "pendingOrders") {
    return {
      text: t("aiAssistant.mock.pendingOrders", { count: MOCK_PENDING_ORDERS.length }),
      items: MOCK_PENDING_ORDERS.map((order) => ({
        title: `${order.code} · ${order.customer}`,
        subtitle: t(`aiAssistant.mock.orderStatus.${order.status}`),
        meta: formatDueDate(order.dueInDays, locale),
      })),
      links: [link(t, "operationalTracking")],
    };
  }

  const guides = {
    createAppointment: ["appointments", "selfBooking", "bookingAvailability"],
    createOrder: ["orders", "operationalTracking", "webOrderApproval"],
    customers: ["customers"],
    products: ["products", "category"],
    category: ["category"],
    reports: ["reports"],
    pageConfiguration: ["pageConfiguration"],
    usersAndPermissions: ["usersAndPermissions"],
  };

  if (guides[intent]) {
    return {
      text: t(`aiAssistant.mock.guides.${intent}`),
      links: guides[intent].map((routeKey) => link(t, routeKey)),
    };
  }

  return { text: t("aiAssistant.mock.fallback") };
}

// Suggested questions shown as quick chips.
export const SUGGESTION_KEYS = [
  "aiAssistant.suggestions.appointmentsEvening",
  "aiAssistant.suggestions.pendingOrders",
  "aiAssistant.suggestions.createAppointment",
  "aiAssistant.suggestions.changeLogo",
];
