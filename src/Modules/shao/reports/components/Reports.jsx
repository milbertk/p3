import { useMemo, useState, useEffect } from "react";
import {
  FaChartColumn,
  FaBoxesStacked,
  FaCalendarDays,
  FaMoneyBillTrendUp,
  FaUserGroup,
  FaFileLines,
  FaMagnifyingGlass,
  FaFilePdf,
  FaCircleInfo,
  FaClock,
  FaRankingStar,
  FaTags,
  FaLock,
} from "react-icons/fa6";
import "./Reports.scss";
// Adjust this path to wherever you keep services (e.g. "../services/ReportsService").
import ReportsService from "../services/ReportsService";
import { exportReportPdf } from "../services/ReportPdfExport";
import useCompanyPlan from "../../../../Shared/Components/Plans/useCompanyPlan";
import PlansModal from "../../../../Shared/Components/Plans/PlansModal";

// Report included in every plan (FREE included). The others need a plan
// with all_reports (2026-10-22); the backend checks it too.
const BASIC_REPORT_ID = "orders-by-status";

/**
 * Reports screen — LIVE DATA ONLY (no mock).
 *
 * Four reports read from the backend through ReportsService:
 *   - Orders by status      (revenue + status, custom date range)
 *   - Appointments summary  (counts + time invested, no revenue)
 *   - Top customers         (ranked; each shown with how it is identified)
 *   - Best-seller products  (order + booking products mixed)
 *
 * When there is no company, the call fails, or the DB is empty, each report
 * shows "No data available" (plus an error banner for a failed call) — it
 * never falls back to invented data. A few reports are listed as "Soon".
 */

// ----- Report catalog (grouped by category) ---------------------------------
const REPORT_CATALOG = [
  {
    category: "Operations",
    reports: [
      { id: "orders-by-status", name: "Orders by status", description: "Order volume, revenue and progress across every stage.", icon: FaChartColumn, status: "ready" },
      { id: "aging-orders", name: "Aging orders", description: "Orders open longer than expected.", icon: FaClock, status: "ready" },
    ],
  },
  {
    category: "Appointments",
    reports: [
      { id: "appointments-summary", name: "Appointments summary", description: "Appointments and time invested by status.", icon: FaCalendarDays, status: "ready" },
      { id: "cancellation-rate", name: "Cancellation rate", description: "Cancelled appointments percentage.", icon: FaUserGroup, status: "ready" },
    ],
  },
  {
    category: "Customers",
    reports: [
      { id: "top-customers", name: "Top customers", description: "Best customers ranked by purchases.", icon: FaRankingStar, status: "ready" },
    ],
  },
  {
    category: "Products",
    reports: [
      { id: "best-sellers", name: "Best-seller products", description: "Top products across orders and bookings.", icon: FaBoxesStacked, status: "ready" },
      { id: "revenue-over-time", name: "Revenue over time", description: "Revenue totals per period.", icon: FaMoneyBillTrendUp, status: "ready" },
    ],
  },
];

// ----- Status vocabulary ----------------------------------------------------
const ORDER_STATUS_LABEL = {
  placed: "Placed",
  inProgress: "In progress",
  partialDone: "Partial done",
  done: "Done",
  cancelled: "Cancelled",
};
const ORDER_STATUS_ORDER = ["placed", "inProgress", "partialDone", "done", "cancelled"];

const APPT_STATUS_LABEL = {
  scheduled: "Scheduled",
  finished: "Finished",
  cancelled: "Cancelled",
};
const APPT_STATUS_ORDER = ["scheduled", "finished", "cancelled"];

const ID_TYPE_LABEL = {
  email: "Email",
  phone: "Phone",
  link: "Web link",
  customerId: "Customer ID",
};

// ----- Helpers --------------------------------------------------------------
function formatMoney(value, locale) {
  const n = Number(value || 0);
  try {
    return new Intl.NumberFormat(locale, { style: "currency", currency: "CRC", maximumFractionDigits: 0 }).format(n);
  } catch {
    return `\u20A1${n.toLocaleString()}`;
  }
}

// PDF fonts have no colón glyph (\u20A1), so the PDF shows the currency code.
function formatMoneyPdf(value, locale) {
  const n = Number(value || 0);
  try {
    return new Intl.NumberFormat(locale, { style: "currency", currency: "CRC", currencyDisplay: "code", maximumFractionDigits: 0 }).format(n);
  } catch {
    return `CRC ${n.toLocaleString()}`;
  }
}

function formatDate(value, locale) {
  if (!value) return "\u2014";
  const d = new Date(`${value}T00:00:00`);
  if (Number.isNaN(d.getTime())) return "\u2014";
  return d.toLocaleDateString(locale, { day: "2-digit", month: "short", year: "numeric" });
}

// ----- Small shared pieces --------------------------------------------------
function ExportButtons({ tr, onExport }) {
  return (
    <div className="reports__export-group">
      <button type="button" className="reports__export reports__export--pdf" onClick={onExport}>
        <FaFilePdf aria-hidden="true" />
        {tr("reports.actions.pdf", "PDF")}
      </button>
    </div>
  );
}

function PeriodFilter({ tr, period, setPeriod, from, to, setFrom, setTo }) {
  return (
    <>
      <label className="report-filter">
        <span>{tr("reports.filters.period", "Period")}</span>
        <select value={period} onChange={(e) => setPeriod(e.target.value)}>
          <option value="all">{tr("reports.period.all", "All time")}</option>
          <option value="week">{tr("reports.period.week", "Last 7 days")}</option>
          <option value="month">{tr("reports.period.month", "Last 30 days")}</option>
          <option value="year">{tr("reports.period.year", "This year")}</option>
          <option value="custom">{tr("reports.period.custom", "Custom range")}</option>
        </select>
      </label>
      {period === "custom" && (
        <div className="report-filter report-filter--range">
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} aria-label={tr("reports.filters.from", "From")} />
          <span className="report-filter__dash">{"\u2013"}</span>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} aria-label={tr("reports.filters.to", "To")} />
        </div>
      )}
    </>
  );
}

function SummaryTiles({ tiles }) {
  return (
    <div className="report-tiles">
      {tiles.map((t) => (
        <div className={`report-tile ${t.variant ? `report-tile--${t.variant}` : ""}`} key={t.label}>
          <small>{t.label}</small>
          <strong>{t.value}</strong>
        </div>
      ))}
    </div>
  );
}

// Resolve the active company the same way the other screens do: from
// localStorage under "selectedCompany" (set when the user picks a company).
const SELECTED_COMPANY_STORAGE_KEY = "selectedCompany";
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

// Translate the period control into concrete from/to dates for the backend.
function periodRange(period, customFrom, customTo) {
  if (period === "custom") return { from: customFrom || "", to: customTo || "" };
  if (period === "all" || !period) return { from: "", to: "" };
  const to = new Date();
  const from = new Date();
  if (period === "week") from.setDate(from.getDate() - 7);
  else if (period === "month") from.setDate(from.getDate() - 30);
  else if (period === "year") from.setFullYear(from.getFullYear() - 1);
  const fmt = (d) => d.toISOString().slice(0, 10);
  return { from: fmt(from), to: fmt(to) };
}

// ============================================================================
export default function Reports({ t, locale = "en", companyId = "", service = ReportsService }) {
  const appLocale = locale.toLowerCase().startsWith("es") ? "es-CR" : "en-US";
  const tr = (key, fallback) =>
    typeof t === "function" ? t(key, { defaultValue: fallback }) : fallback;

  // Use the prop when given, otherwise read the selected company from storage.
  const resolvedCompanyId = useMemo(() => companyId || readSelectedCompanyId(), [companyId]);

  const firstReady = REPORT_CATALOG.flatMap((g) => g.reports).find((r) => r.status === "ready") || null;
  const [activeId, setActiveId] = useState(firstReady ? firstReady.id : null);
  const [catalogSearch, setCatalogSearch] = useState("");
  const [message, setMessage] = useState("");
  const [serverData, setServerData] = useState({}); // { [reportId]: backend result | null }
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Shared filters
  const [period, setPeriod] = useState("all");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [apptStatusFilter, setApptStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [agingStatus, setAgingStatus] = useState("all"); // aging report: open-status filter
  const [agingMinDays, setAgingMinDays] = useState(""); // aging report: minimum age in days
  const [granularity, setGranularity] = useState("month"); // revenue-over-time: day|week|month
  const [rowSearch, setRowSearch] = useState("");

  // Company plan: FREE shows only "Orders by status"; the rest are locked.
  const { data: planData } = useCompanyPlan(resolvedCompanyId);
  const allReports = planData?.current?.plan?.allReports ?? true;
  const planName = planData?.current
    ? tr(`plans.names.${planData.current.planCode}`, planData.current.plan?.name || planData.current.planCode)
    : "";
  const isLocked = (id) => !allReports && id !== BASIC_REPORT_ID;
  // tr() with values ({{plan}}).
  const trv = (key, fallback, values = {}) =>
    typeof t === "function"
      ? t(key, { defaultValue: fallback, ...values })
      : fallback.replace(/\{\{(\w+)\}\}/g, (_, name) => String(values[name] ?? ""));
  const [showPlans, setShowPlans] = useState(false);

  const activeReport = useMemo(() => {
    const report = REPORT_CATALOG.flatMap((g) => g.reports).find((r) => r.id === activeId) || null;
    if (report && report.status === "ready" && !allReports && report.id !== BASIC_REPORT_ID) {
      return { ...report, status: "locked" };
    }
    return report;
  }, [activeId, allReports]);

  const filteredCatalog = useMemo(() => {
    const term = catalogSearch.trim().toLowerCase();
    if (!term) return REPORT_CATALOG;
    return REPORT_CATALOG.map((group) => ({
      ...group,
      reports: group.reports.filter((r) => `${r.name} ${r.description}`.toLowerCase().includes(term)),
    })).filter((group) => group.reports.length > 0);
  }, [catalogSearch]);

  // ----- Load the active report from the backend (live data only) -----
  useEffect(() => {
    if (!resolvedCompanyId || !activeReport || activeReport.status !== "ready") return undefined;
    const id = activeReport.id;
    const { from, to } = periodRange(period, customFrom, customTo);
    let cancelled = false;
    setLoading(true);
    setError("");
    (async () => {
      try {
        let result = null;
        if (id === "orders-by-status") {
          result = await service.getOrdersByStatus(resolvedCompanyId, { from, to, status: statusFilter });
        } else if (id === "appointments-summary") {
          result = await service.getAppointmentsSummary(resolvedCompanyId, { from, to, status: apptStatusFilter });
        } else if (id === "top-customers") {
          result = await service.getTopCustomers(resolvedCompanyId, { limit: 10 });
        } else if (id === "best-sellers") {
          result = await service.getBestSellers(resolvedCompanyId, { type: typeFilter, limit: 50 });
        } else if (id === "aging-orders") {
          result = await service.getAgingOrders(resolvedCompanyId, { status: agingStatus, minDays: agingMinDays });
        } else if (id === "cancellation-rate") {
          result = await service.getCancellationRate(resolvedCompanyId, { from, to });
        } else if (id === "revenue-over-time") {
          result = await service.getRevenueOverTime(resolvedCompanyId, { from, to, granularity });
        }
        if (!cancelled) setServerData((prev) => ({ ...prev, [id]: result || null }));
      } catch (e) {
        if (!cancelled) {
          setServerData((prev) => ({ ...prev, [id]: null }));
          setError(e && e.message ? e.message : "Could not load the report.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [activeReport, resolvedCompanyId, service, period, customFrom, customTo, statusFilter, apptStatusFilter, typeFilter, agingStatus, agingMinDays, granularity]);

  // ===== Resolve LIVE backend data only. No mock anywhere. =====
  // When there is no live result (no company, failed call, or empty DB) the
  // summaries are zeroed and the row lists are empty, so each report shows
  // "No data available" instead of invented numbers.
  const term = rowSearch.trim().toLowerCase();

  // Orders
  const ordersLive = serverData["orders-by-status"];
  const ordersSummary = {
    counts: (ordersLive && ordersLive.counts) || { placed: 0, inProgress: 0, partialDone: 0, done: 0, cancelled: 0 },
    total: (ordersLive && ordersLive.total) || 0,
    revenue: (ordersLive && ordersLive.revenue) || 0,
  };
  const ordersRows = ((ordersLive && ordersLive.rows) || [])
    .map((r) => ({
      id: r.orderCode || r.orderInternalId,
      customer: r.customerName,
      status: r.status,
      items: r.items,
      createdAt: r.createdAt,
      total: r.total,
    }))
    .filter((r) => !term || `${r.id} ${r.customer}`.toLowerCase().includes(term));

  // Appointments
  const apptLive = serverData["appointments-summary"];
  const apptSummary = {
    counts: (apptLive && apptLive.counts) || { scheduled: 0, finished: 0, cancelled: 0 },
    total: (apptLive && apptLive.total) || 0,
    hours: (((apptLive && apptLive.timeMinutes) || 0) / 60).toFixed(1),
  };
  const apptRows = ((apptLive && apptLive.rows) || [])
    .map((r) => ({
      id: r.appointmentId,
      customer: r.customerName,
      service: r.serviceName,
      status: r.status,
      date: r.date,
      durationMin: r.durationMin,
    }))
    .filter((r) => !term || `${r.id} ${r.customer} ${r.service}`.toLowerCase().includes(term));

  // Top customers
  const custLive = serverData["top-customers"];
  const customerRows = ((custLive && custLive.rows) || []).filter((c) =>
    !term ? true : `${c.name} ${c.idValue}`.toLowerCase().includes(term),
  );

  // Best sellers
  const prodLive = serverData["best-sellers"];
  const productRows = ((prodLive && prodLive.rows) || []).filter((p) =>
    !term ? true : String(p.name).toLowerCase().includes(term),
  );
  const productSummary = {
    count: productRows.length,
    units: productRows.reduce((s, p) => s + (p.units || 0), 0),
    revenue: productRows.reduce((s, p) => s + (p.revenue || 0), 0),
    top: productRows[0] ? productRows[0].name : "\u2014",
  };

  // Aging orders
  const agingLive = serverData["aging-orders"];
  const agingSummary = {
    totalOpen: (agingLive && agingLive.totalOpen) || 0,
    fresh: (agingLive && agingLive.fresh) || 0,
    aging: (agingLive && agingLive.aging) || 0,
    overdue: (agingLive && agingLive.overdue) || 0,
    oldestDays: (agingLive && agingLive.oldestDays) || 0,
  };
  const agingRows = ((agingLive && agingLive.rows) || []).filter((r) =>
    !term ? true : `${r.orderCode} ${r.customerName}`.toLowerCase().includes(term),
  );

  // Cancellation rate
  const cancelLive = serverData["cancellation-rate"];
  const cancelSummary = {
    total: (cancelLive && cancelLive.total) || 0,
    cancelled: (cancelLive && cancelLive.cancelled) || 0,
    ratePct: (cancelLive && cancelLive.ratePct) || 0,
  };
  const cancelMonths = (cancelLive && cancelLive.months) || [];

  // Revenue over time
  const revLive = serverData["revenue-over-time"];
  const revSummary = {
    totalRevenue: (revLive && revLive.totalRevenue) || 0,
    totalOrders: (revLive && revLive.totalOrders) || 0,
    avgOrderValue: (revLive && revLive.avgOrderValue) || 0,
    bestPeriod: (revLive && revLive.bestPeriod) || "—",
    bestRevenue: (revLive && revLive.bestRevenue) || 0,
  };
  const revPoints = (revLive && revLive.points) || [];
  const revMax = revPoints.reduce((m, p) => Math.max(m, p.revenue || 0), 0);

  const resetFilters = () => {
    setPeriod("all");
    setCustomFrom("");
    setCustomTo("");
    setStatusFilter("all");
    setApptStatusFilter("all");
    setTypeFilter("all");
    setAgingStatus("all");
    setAgingMinDays("");
    setGranularity("month");
    setRowSearch("");
    setMessage("");
  };

  // ----- PDF export: the rows and totals currently shown (filters applied) -----
  const periodDescription = () => {
    if (period === "custom") {
      return `${tr("reports.period.custom", "Custom range")}: ${formatDate(customFrom, appLocale)} \u2013 ${formatDate(customTo, appLocale)}`;
    }
    const labels = {
      all: tr("reports.period.all", "All time"),
      week: tr("reports.period.week", "Last 7 days"),
      month: tr("reports.period.month", "Last 30 days"),
      year: tr("reports.period.year", "This year"),
    };
    return labels[period] || labels.all;
  };

  const filterLine = (label, value) => `${label}: ${value}`;
  const allLabel = tr("reports.filters.all", "All");
  const searchLine = () => (rowSearch.trim() ? [filterLine(tr("reports.export.search", "Search"), rowSearch.trim())] : []);

  const buildExportReport = (id) => {
    const money = (value) => formatMoneyPdf(value, appLocale);
    const date = (value) => formatDate(value, appLocale);
    const orderStatus = (s) => tr(`reports.status.${s}`, ORDER_STATUS_LABEL[s] || s);
    const apptStatus = (s) => tr(`reports.apptStatus.${s}`, APPT_STATUS_LABEL[s] || s);
    const col = (key, fallback, numeric = false) => ({ header: tr(`reports.columns.${key}`, fallback), numeric });
    const periodLine = filterLine(tr("reports.filters.period", "Period"), periodDescription());

    switch (id) {
      case "orders-by-status":
        return {
          filters: [
            periodLine,
            filterLine(tr("reports.filters.status", "Status"), statusFilter === "all" ? allLabel : orderStatus(statusFilter)),
            ...searchLine(),
          ],
          tiles: [
            { label: tr("reports.tiles.total", "Total orders"), value: ordersSummary.total },
            ...ORDER_STATUS_ORDER.map((s) => ({ label: orderStatus(s), value: ordersSummary.counts[s] || 0 })),
            { label: tr("reports.tiles.revenue", "Revenue"), value: money(ordersSummary.revenue) },
          ],
          columns: [col("order", "Order"), col("customer", "Customer"), col("status", "Status"), col("items", "Items", true), col("created", "Created"), col("total", "Total", true)],
          rows: ordersRows.map((r) => [r.id, r.customer, orderStatus(r.status), r.items, date(r.createdAt), money(r.total)]),
          note: tr("reports.liveNote", "Showing live data from your orders."),
        };
      case "appointments-summary":
        return {
          filters: [
            periodLine,
            filterLine(tr("reports.filters.status", "Status"), apptStatusFilter === "all" ? allLabel : apptStatus(apptStatusFilter)),
            ...searchLine(),
          ],
          tiles: [
            { label: tr("reports.tiles.totalAppointments", "Total appointments"), value: apptSummary.total },
            ...APPT_STATUS_ORDER.map((s) => ({ label: apptStatus(s), value: apptSummary.counts[s] || 0 })),
            { label: tr("reports.tiles.timeInvested", "Time invested (h)"), value: apptSummary.hours },
          ],
          columns: [col("appointment", "Appointment"), col("customer", "Customer"), col("service", "Service"), col("status", "Status"), col("date", "Date"), col("duration", "Duration (min)", true)],
          rows: apptRows.map((r) => [r.id, r.customer, r.service, apptStatus(r.status), date(r.date), r.durationMin]),
          note: tr("reports.noteAppt", "Appointments have no revenue, so this report measures volume and time invested."),
        };
      case "top-customers":
        return {
          filters: searchLine(),
          tiles: [
            { label: tr("reports.tiles.customersShown", "Customers shown"), value: customerRows.length },
            { label: tr("reports.tiles.topBuyer", "Top buyer"), value: customerRows[0] ? customerRows[0].name : "\u2014" },
            { label: tr("reports.tiles.topSpent", "Top spent"), value: money(customerRows[0] ? customerRows[0].spent : 0) },
          ],
          columns: [{ header: "#", numeric: true }, col("customer", "Customer"), col("identifiedBy", "Identified by"), col("orders", "Orders", true), col("appointments", "Appointments", true), col("spent", "Spent", true)],
          rows: customerRows.map((c, i) => [
            i + 1,
            c.name,
            `${tr(`reports.idType.${c.idType}`, ID_TYPE_LABEL[c.idType] || c.idType)}: ${c.idValue}`,
            c.orders,
            c.appointments,
            money(c.spent),
          ]),
          note: tr("reports.noteCustomer", "A customer may be identified by phone, email, web link or customer ID."),
        };
      case "best-sellers":
        return {
          filters: [
            filterLine(tr("reports.filters.type", "Type"), typeFilter === "all" ? allLabel : tr(`reports.type.${typeFilter}`, typeFilter === "order" ? "Order" : "Booking")),
            ...searchLine(),
          ],
          tiles: [
            { label: tr("reports.tiles.productsShown", "Products shown"), value: productSummary.count },
            { label: tr("reports.tiles.unitsSold", "Units sold"), value: productSummary.units },
            { label: tr("reports.tiles.topSeller", "Top seller"), value: productSummary.top },
            { label: tr("reports.tiles.revenue", "Revenue"), value: money(productSummary.revenue) },
          ],
          columns: [{ header: "#", numeric: true }, col("product", "Product"), col("type", "Type"), col("units", "Units", true), col("revenue", "Revenue", true)],
          rows: productRows.map((p, i) => [i + 1, p.name, tr(`reports.type.${p.type}`, p.type === "order" ? "Order" : "Booking"), p.units, money(p.revenue)]),
          note: tr("reports.noteProduct", "Order products and booking products are combined into one ranking."),
        };
      case "aging-orders":
        return {
          filters: [
            filterLine(tr("reports.filters.status", "Status"), agingStatus === "all" ? tr("reports.filters.all", "All open") : orderStatus(agingStatus)),
            ...(String(agingMinDays).trim() ? [filterLine(tr("reports.filters.minDays", "Min age (days)"), agingMinDays)] : []),
            ...searchLine(),
          ],
          tiles: [
            { label: tr("reports.tiles.openOrders", "Open orders"), value: agingSummary.totalOpen },
            { label: tr("reports.tiles.fresh", "Fresh (\u22647d)"), value: agingSummary.fresh },
            { label: tr("reports.tiles.aging", "Aging (8\u201330d)"), value: agingSummary.aging },
            { label: tr("reports.tiles.overdue", "Overdue (>30d)"), value: agingSummary.overdue },
            { label: tr("reports.tiles.oldest", "Oldest (days)"), value: agingSummary.oldestDays },
          ],
          columns: [col("order", "Order"), col("customer", "Customer"), col("status", "Status"), col("created", "Created"), col("age", "Age (days)", true), col("items", "Items", true), col("total", "Total", true)],
          rows: agingRows.map((r) => [r.orderCode, r.customerName || "\u2014", orderStatus(r.status), date(r.createdAt), r.ageDays, r.items, money(r.total)]),
          note: tr("reports.noteAging", "Open = not done and not cancelled. Age is days since the order was created; oldest first."),
        };
      case "cancellation-rate":
        return {
          filters: [periodLine],
          tiles: [
            { label: tr("reports.tiles.totalAppointments", "Total appointments"), value: cancelSummary.total },
            { label: tr("reports.tiles.cancelled", "Cancelled"), value: cancelSummary.cancelled },
            { label: tr("reports.tiles.cancelRate", "Cancellation rate"), value: `${cancelSummary.ratePct}%` },
          ],
          columns: [col("month", "Month"), col("total", "Total", true), col("cancelled", "Cancelled", true), col("rate", "Rate", true)],
          rows: cancelMonths.map((m) => [m.period, m.total, m.cancelled, `${m.ratePct}%`]),
          note: tr("reports.noteCancel", "Cancelled counts CANCELLED and REJECTED appointments. There is no separate no-show status."),
        };
      case "revenue-over-time":
        return {
          filters: [
            periodLine,
            filterLine(tr("reports.filters.granularity", "Group by"), tr(`reports.granularity.${granularity}`, granularity)),
          ],
          tiles: [
            { label: tr("reports.tiles.revenue", "Revenue"), value: money(revSummary.totalRevenue) },
            { label: tr("reports.tiles.orders", "Orders"), value: revSummary.totalOrders },
            { label: tr("reports.tiles.avgOrder", "Avg order value"), value: money(revSummary.avgOrderValue) },
            { label: tr("reports.tiles.bestPeriod", "Best period"), value: revSummary.bestPeriod },
          ],
          columns: [col("period", "Period"), col("orders", "Orders", true), col("revenue", "Revenue", true)],
          rows: revPoints.map((p) => [p.period, p.orders, money(p.revenue)]),
          note: tr("reports.noteRevenue", "Revenue sums order totals, excluding cancelled orders. Each row is one period bucket."),
        };
      default:
        return null;
    }
  };

  const handleExport = () => {
    if (!activeReport) return;
    setMessage("");

    const content = buildExportReport(activeReport.id);
    if (!content) return;

    try {
      exportReportPdf(
        {
          title: tr(`reports.item.${activeReport.id}.name`, activeReport.name),
          description: tr(`reports.item.${activeReport.id}.desc`, activeReport.description),
          ...content,
        },
        {
          generated: tr("reports.export.generated", "Generated"),
          summary: tr("reports.export.summary", "Summary"),
          noData: tr("reports.noData", "No data available."),
          page: tr("reports.export.page", "Page"),
        },
        appLocale,
      );
    } catch (e) {
      console.error("[Reports] PDF export failed:", e);
      setMessage(tr("reports.export.error", "The PDF could not be generated. Please try again."));
    }
  };

  return (
    <section className="reports">
      <header className="reports__header">
        <div>
          <p className="reports__eyebrow">{tr("reports.eyebrow", "SERVICE HUB \u00B7 REPORTS")}</p>
          <h1>{tr("reports.title", "Reports")}</h1>
          <p>{tr("reports.description", "Browse reports grouped by category and review the results.")}</p>
        </div>
      </header>

      {loading && <p className="reports__message">{tr("reports.loading", "Loading report\u2026")}</p>}
      {error && <p className="reports__message reports__message--error">{error}</p>}
      {message && <p className="reports__message">{message}</p>}

      <div className="reports__layout">
        {/* ---- Catalog ---- */}
        <aside className="reports__catalog">
          <div className="reports__catalog-search">
            <FaMagnifyingGlass aria-hidden="true" />
            <input
              type="text"
              value={catalogSearch}
              onChange={(e) => setCatalogSearch(e.target.value)}
              placeholder={tr("reports.catalog.search", "Search reports\u2026")}
            />
          </div>

          {filteredCatalog.length === 0 && (
            <p className="reports__catalog-empty">{tr("reports.catalog.empty", "No reports match your search.")}</p>
          )}

          {filteredCatalog.map((group) => (
            <div className="reports__group" key={group.category}>
              <h2 className="reports__group-title">
                {tr(`reports.category.${group.category.toLowerCase()}`, group.category)}
              </h2>
              <ul className="reports__group-list">
                {group.reports.map((report) => {
                  const Icon = report.icon || FaFileLines;
                  const isActive = report.id === activeId;
                  const isReady = report.status === "ready";
                  const locked = isReady && isLocked(report.id);
                  return (
                    <li key={report.id}>
                      <button
                        type="button"
                        className={`reports__item ${isActive ? "is-active" : ""} ${isReady ? "" : "is-soon"} ${locked ? "is-locked" : ""}`}
                        onClick={() => { setActiveId(report.id); resetFilters(); }}
                      >
                        <span className="reports__item-icon"><Icon aria-hidden="true" /></span>
                        <span className="reports__item-text">
                          <strong>{tr(`reports.item.${report.id}.name`, report.name)}</strong>
                          <small>{tr(`reports.item.${report.id}.desc`, report.description)}</small>
                        </span>
                        {!isReady && <span className="reports__item-badge">{tr("reports.soon", "Soon")}</span>}
                        {locked && (
                          <span className="reports__item-badge reports__item-badge--locked" title={tr("plans.reports.lockedBadgeTitle", "Not included in your plan")}>
                            <FaLock aria-hidden="true" /> {tr("plans.reports.lockedBadge", "Upgrade")}
                          </span>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </aside>

        {/* ---- Active report ---- */}
        <div className="reports__content">
          {!activeReport && (
            <div className="reports__placeholder">
              <FaFileLines aria-hidden="true" />
              <p>{tr("reports.selectPrompt", "Select a report from the list.")}</p>
            </div>
          )}

          {activeReport && activeReport.status === "locked" && (
            <div className="plan-locked">
              <FaLock aria-hidden="true" />
              <h3>{tr(`reports.item.${activeReport.id}.name`, activeReport.name)}</h3>
              <p>
                {trv(
                  "plans.reports.lockedText",
                  "Your {{plan}} plan includes only the \"Orders by status\" report. Request a plan to use every report.",
                  { plan: planName },
                )}
              </p>
              <button type="button" className="plans-form__primary" onClick={() => setShowPlans(true)}>
                {tr("plans.seePlans", "See plans")}
              </button>
            </div>
          )}

          {activeReport && activeReport.status === "soon" && (
            <div className="reports__placeholder">
              <FaClock aria-hidden="true" />
              <h3>{tr(`reports.item.${activeReport.id}.name`, activeReport.name)}</h3>
              <p>{tr("reports.comingSoon", "This report is coming soon.")}</p>
            </div>
          )}

          {/* ===== Orders by status ===== */}
          {activeReport && activeReport.status === "ready" && activeReport.id === "orders-by-status" && (
            <div className="report-view">
              <div className="report-view__bar">
                <div>
                  <h2>{tr("reports.item.orders-by-status.name", "Orders by status")}</h2>
                  <p>{tr("reports.item.orders-by-status.desc", "Order volume, revenue and progress across every stage.")}</p>
                </div>
                <ExportButtons tr={tr} onExport={handleExport} />
              </div>

              <SummaryTiles
                tiles={[
                  { label: tr("reports.tiles.total", "Total orders"), value: ordersSummary.total },
                  ...ORDER_STATUS_ORDER.map((s) => ({ label: tr(`reports.status.${s}`, ORDER_STATUS_LABEL[s]), value: ordersSummary.counts[s], variant: s })),
                  { label: tr("reports.tiles.revenue", "Revenue"), value: formatMoney(ordersSummary.revenue, appLocale), variant: "revenue" },
                ]}
              />

              <div className="report-dist">
                <h3>{tr("reports.distribution", "Distribution by status")}</h3>
                {ORDER_STATUS_ORDER.map((s) => {
                  const count = ordersSummary.counts[s];
                  const pct = ordersSummary.total ? Math.round((count / ordersSummary.total) * 100) : 0;
                  return (
                    <div className="report-dist__row" key={s}>
                      <span className="report-dist__label">{tr(`reports.status.${s}`, ORDER_STATUS_LABEL[s])}</span>
                      <span className="report-dist__track">
                        <span className={`report-dist__fill report-dist__fill--${s}`} style={{ width: `${pct}%` }} />
                      </span>
                      <span className="report-dist__value">{count} {"\u00B7"} {pct}%</span>
                    </div>
                  );
                })}
              </div>

              <div className="report-view__filters">
                <div className="report-filter report-filter--search">
                  <FaMagnifyingGlass aria-hidden="true" />
                  <input type="text" value={rowSearch} onChange={(e) => setRowSearch(e.target.value)} placeholder={tr("reports.filters.search", "Search by order or customer\u2026")} />
                </div>
                <label className="report-filter">
                  <span>{tr("reports.filters.status", "Status")}</span>
                  <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                    <option value="all">{tr("reports.filters.all", "All")}</option>
                    {ORDER_STATUS_ORDER.map((s) => (
                      <option key={s} value={s}>{tr(`reports.status.${s}`, ORDER_STATUS_LABEL[s])}</option>
                    ))}
                  </select>
                </label>
                <PeriodFilter tr={tr} period={period} setPeriod={setPeriod} from={customFrom} to={customTo} setFrom={setCustomFrom} setTo={setCustomTo} />
                <button type="button" className="report-view__reset" onClick={resetFilters}>{tr("reports.actions.reset", "Reset")}</button>
              </div>

              <div className="report-table-wrap">
                <table className="report-table">
                  <thead>
                    <tr>
                      <th>{tr("reports.columns.order", "Order")}</th>
                      <th>{tr("reports.columns.customer", "Customer")}</th>
                      <th>{tr("reports.columns.status", "Status")}</th>
                      <th className="is-num">{tr("reports.columns.items", "Items")}</th>
                      <th>{tr("reports.columns.created", "Created")}</th>
                      <th className="is-num">{tr("reports.columns.total", "Total")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ordersRows.length === 0 && (
                      <tr><td colSpan={6} className="report-table__empty">{tr("reports.noData", "No data available.")}</td></tr>
                    )}
                    {ordersRows.map((r) => (
                      <tr key={r.id}>
                        <td><strong>{r.id}</strong></td>
                        <td>{r.customer}</td>
                        <td><span className={`report-status report-status--${r.status}`}>{tr(`reports.status.${r.status}`, ORDER_STATUS_LABEL[r.status])}</span></td>
                        <td className="is-num">{r.items}</td>
                        <td>{formatDate(r.createdAt, appLocale)}</td>
                        <td className="is-num">{formatMoney(r.total, appLocale)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <p className="report-view__note">
                <FaCircleInfo aria-hidden="true" />
                {!resolvedCompanyId
                  ? tr("reports.noCompany", "No company selected — pick a company to load this report.")
                  : tr("reports.liveNote", "Showing live data from your orders.")}
              </p>
            </div>
          )}

          {/* ===== Appointments summary ===== */}
          {activeReport && activeReport.status === "ready" && activeReport.id === "appointments-summary" && (
            <div className="report-view">
              <div className="report-view__bar">
                <div>
                  <h2>{tr("reports.item.appointments-summary.name", "Appointments summary")}</h2>
                  <p>{tr("reports.item.appointments-summary.desc", "Appointments and time invested by status.")}</p>
                </div>
                <ExportButtons tr={tr} onExport={handleExport} />
              </div>

              <SummaryTiles
                tiles={[
                  { label: tr("reports.tiles.totalAppointments", "Total appointments"), value: apptSummary.total },
                  ...APPT_STATUS_ORDER.map((s) => ({ label: tr(`reports.apptStatus.${s}`, APPT_STATUS_LABEL[s]), value: apptSummary.counts[s], variant: s === "finished" ? "done" : s })),
                  { label: tr("reports.tiles.timeInvested", "Time invested (h)"), value: apptSummary.hours, variant: "revenue" },
                ]}
              />

              <div className="report-view__filters">
                <div className="report-filter report-filter--search">
                  <FaMagnifyingGlass aria-hidden="true" />
                  <input type="text" value={rowSearch} onChange={(e) => setRowSearch(e.target.value)} placeholder={tr("reports.filters.searchAppt", "Search by customer or service\u2026")} />
                </div>
                <label className="report-filter">
                  <span>{tr("reports.filters.status", "Status")}</span>
                  <select value={apptStatusFilter} onChange={(e) => setApptStatusFilter(e.target.value)}>
                    <option value="all">{tr("reports.filters.all", "All")}</option>
                    {APPT_STATUS_ORDER.map((s) => (
                      <option key={s} value={s}>{tr(`reports.apptStatus.${s}`, APPT_STATUS_LABEL[s])}</option>
                    ))}
                  </select>
                </label>
                <PeriodFilter tr={tr} period={period} setPeriod={setPeriod} from={customFrom} to={customTo} setFrom={setCustomFrom} setTo={setCustomTo} />
                <button type="button" className="report-view__reset" onClick={resetFilters}>{tr("reports.actions.reset", "Reset")}</button>
              </div>

              <div className="report-table-wrap">
                <table className="report-table">
                  <thead>
                    <tr>
                      <th>{tr("reports.columns.appointment", "Appointment")}</th>
                      <th>{tr("reports.columns.customer", "Customer")}</th>
                      <th>{tr("reports.columns.service", "Service")}</th>
                      <th>{tr("reports.columns.status", "Status")}</th>
                      <th>{tr("reports.columns.date", "Date")}</th>
                      <th className="is-num">{tr("reports.columns.duration", "Duration (min)")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {apptRows.length === 0 && (
                      <tr><td colSpan={6} className="report-table__empty">{tr("reports.noData", "No data available.")}</td></tr>
                    )}
                    {apptRows.map((r) => (
                      <tr key={r.id}>
                        <td><strong>{r.id}</strong></td>
                        <td>{r.customer}</td>
                        <td>{r.service}</td>
                        <td><span className={`report-status report-status--${r.status === "finished" ? "done" : r.status}`}>{tr(`reports.apptStatus.${r.status}`, APPT_STATUS_LABEL[r.status])}</span></td>
                        <td>{formatDate(r.date, appLocale)}</td>
                        <td className="is-num">{r.durationMin}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <p className="report-view__note"><FaCircleInfo aria-hidden="true" />{tr("reports.noteAppt", "Appointments have no revenue, so this report measures volume and time invested.")}</p>
            </div>
          )}

          {/* ===== Top customers ===== */}
          {activeReport && activeReport.status === "ready" && activeReport.id === "top-customers" && (
            <div className="report-view">
              <div className="report-view__bar">
                <div>
                  <h2>{tr("reports.item.top-customers.name", "Top customers")}</h2>
                  <p>{tr("reports.item.top-customers.desc", "Best customers ranked by purchases.")}</p>
                </div>
                <ExportButtons tr={tr} onExport={handleExport} />
              </div>

              <SummaryTiles
                tiles={[
                  { label: tr("reports.tiles.customersShown", "Customers shown"), value: customerRows.length },
                  { label: tr("reports.tiles.topBuyer", "Top buyer"), value: customerRows[0] ? customerRows[0].name : "\u2014" },
                  { label: tr("reports.tiles.topSpent", "Top spent"), value: formatMoney(customerRows[0] ? customerRows[0].spent : 0, appLocale), variant: "revenue" },
                ]}
              />

              <div className="report-view__filters">
                <div className="report-filter report-filter--search">
                  <FaMagnifyingGlass aria-hidden="true" />
                  <input type="text" value={rowSearch} onChange={(e) => setRowSearch(e.target.value)} placeholder={tr("reports.filters.searchCustomer", "Search by name or contact\u2026")} />
                </div>
                <button type="button" className="report-view__reset" onClick={resetFilters}>{tr("reports.actions.reset", "Reset")}</button>
              </div>

              <div className="report-table-wrap">
                <table className="report-table">
                  <thead>
                    <tr>
                      <th className="is-num">#</th>
                      <th>{tr("reports.columns.customer", "Customer")}</th>
                      <th>{tr("reports.columns.identifiedBy", "Identified by")}</th>
                      <th className="is-num">{tr("reports.columns.orders", "Orders")}</th>
                      <th className="is-num">{tr("reports.columns.appointments", "Appointments")}</th>
                      <th className="is-num">{tr("reports.columns.spent", "Spent")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {customerRows.length === 0 && (
                      <tr><td colSpan={6} className="report-table__empty">{tr("reports.noData", "No data available.")}</td></tr>
                    )}
                    {customerRows.map((c, i) => (
                      <tr key={`${c.idType}-${c.idValue}`}>
                        <td className="is-num">{i + 1}</td>
                        <td><strong>{c.name}</strong></td>
                        <td>
                          <span className={`report-idtype report-idtype--${c.idType}`}>{tr(`reports.idType.${c.idType}`, ID_TYPE_LABEL[c.idType])}</span>
                          <span className="report-idvalue">{c.idValue}</span>
                        </td>
                        <td className="is-num">{c.orders}</td>
                        <td className="is-num">{c.appointments}</td>
                        <td className="is-num">{formatMoney(c.spent, appLocale)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <p className="report-view__note"><FaCircleInfo aria-hidden="true" />{tr("reports.noteCustomer", "A customer may be identified by phone, email, web link or customer ID.")}</p>
            </div>
          )}

          {/* ===== Best sellers ===== */}
          {activeReport && activeReport.status === "ready" && activeReport.id === "best-sellers" && (
            <div className="report-view">
              <div className="report-view__bar">
                <div>
                  <h2>{tr("reports.item.best-sellers.name", "Best-seller products")}</h2>
                  <p>{tr("reports.item.best-sellers.desc", "Top products across orders and bookings.")}</p>
                </div>
                <ExportButtons tr={tr} onExport={handleExport} />
              </div>

              <SummaryTiles
                tiles={[
                  { label: tr("reports.tiles.productsShown", "Products shown"), value: productSummary.count },
                  { label: tr("reports.tiles.unitsSold", "Units sold"), value: productSummary.units },
                  { label: tr("reports.tiles.topSeller", "Top seller"), value: productSummary.top },
                  { label: tr("reports.tiles.revenue", "Revenue"), value: formatMoney(productSummary.revenue, appLocale), variant: "revenue" },
                ]}
              />

              <div className="report-view__filters">
                <div className="report-filter report-filter--search">
                  <FaMagnifyingGlass aria-hidden="true" />
                  <input type="text" value={rowSearch} onChange={(e) => setRowSearch(e.target.value)} placeholder={tr("reports.filters.searchProduct", "Search by product\u2026")} />
                </div>
                <label className="report-filter">
                  <span>{tr("reports.filters.type", "Type")}</span>
                  <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
                    <option value="all">{tr("reports.filters.all", "All")}</option>
                    <option value="order">{tr("reports.type.order", "Order")}</option>
                    <option value="booking">{tr("reports.type.booking", "Booking")}</option>
                  </select>
                </label>
                <button type="button" className="report-view__reset" onClick={resetFilters}>{tr("reports.actions.reset", "Reset")}</button>
              </div>

              <div className="report-table-wrap">
                <table className="report-table">
                  <thead>
                    <tr>
                      <th className="is-num">#</th>
                      <th>{tr("reports.columns.product", "Product")}</th>
                      <th>{tr("reports.columns.type", "Type")}</th>
                      <th className="is-num">{tr("reports.columns.units", "Units")}</th>
                      <th className="is-num">{tr("reports.columns.revenue", "Revenue")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {productRows.length === 0 && (
                      <tr><td colSpan={5} className="report-table__empty">{tr("reports.noData", "No data available.")}</td></tr>
                    )}
                    {productRows.map((p, i) => (
                      <tr key={p.name}>
                        <td className="is-num">{i + 1}</td>
                        <td><strong>{p.name}</strong></td>
                        <td><span className={`report-type report-type--${p.type}`}><FaTags aria-hidden="true" />{tr(`reports.type.${p.type}`, p.type === "order" ? "Order" : "Booking")}</span></td>
                        <td className="is-num">{p.units}</td>
                        <td className="is-num">{formatMoney(p.revenue, appLocale)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <p className="report-view__note"><FaCircleInfo aria-hidden="true" />{tr("reports.noteProduct", "Order products and booking products are combined into one ranking.")}</p>
            </div>
          )}

          {/* ===== Aging orders ===== */}
          {activeReport && activeReport.status === "ready" && activeReport.id === "aging-orders" && (
            <div className="report-view">
              <div className="report-view__bar">
                <div>
                  <h2>{tr("reports.item.aging-orders.name", "Aging orders")}</h2>
                  <p>{tr("reports.item.aging-orders.desc", "Open orders (not done or cancelled), oldest first.")}</p>
                </div>
                <ExportButtons tr={tr} onExport={handleExport} />
              </div>

              <SummaryTiles
                tiles={[
                  { label: tr("reports.tiles.openOrders", "Open orders"), value: agingSummary.totalOpen },
                  { label: tr("reports.tiles.fresh", "Fresh (≤7d)"), value: agingSummary.fresh, variant: "done" },
                  { label: tr("reports.tiles.aging", "Aging (8–30d)"), value: agingSummary.aging, variant: "partialDone" },
                  { label: tr("reports.tiles.overdue", "Overdue (>30d)"), value: agingSummary.overdue, variant: "cancelled" },
                  { label: tr("reports.tiles.oldest", "Oldest (days)"), value: agingSummary.oldestDays },
                ]}
              />

              <div className="report-view__filters">
                <div className="report-filter report-filter--search">
                  <FaMagnifyingGlass aria-hidden="true" />
                  <input type="text" value={rowSearch} onChange={(e) => setRowSearch(e.target.value)} placeholder={tr("reports.filters.search", "Search by order or customer…")} />
                </div>
                <label className="report-filter">
                  <span>{tr("reports.filters.status", "Status")}</span>
                  <select value={agingStatus} onChange={(e) => setAgingStatus(e.target.value)}>
                    <option value="all">{tr("reports.filters.all", "All open")}</option>
                    {["placed", "inProgress", "partialDone"].map((s) => (
                      <option key={s} value={s}>{tr(`reports.status.${s}`, ORDER_STATUS_LABEL[s])}</option>
                    ))}
                  </select>
                </label>
                <label className="report-filter">
                  <span>{tr("reports.filters.minDays", "Min age (days)")}</span>
                  <input
                    type="number"
                    min="0"
                    className="report-filter__num"
                    value={agingMinDays}
                    onChange={(e) => setAgingMinDays(e.target.value)}
                    placeholder="0"
                  />
                </label>
                <button type="button" className="report-view__reset" onClick={resetFilters}>{tr("reports.actions.reset", "Reset")}</button>
              </div>

              <div className="report-table-wrap">
                <table className="report-table">
                  <thead>
                    <tr>
                      <th>{tr("reports.columns.order", "Order")}</th>
                      <th>{tr("reports.columns.customer", "Customer")}</th>
                      <th>{tr("reports.columns.status", "Status")}</th>
                      <th>{tr("reports.columns.created", "Created")}</th>
                      <th className="is-num">{tr("reports.columns.age", "Age (days)")}</th>
                      <th className="is-num">{tr("reports.columns.items", "Items")}</th>
                      <th className="is-num">{tr("reports.columns.total", "Total")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {agingRows.length === 0 && (
                      <tr><td colSpan={7} className="report-table__empty">{tr("reports.noData", "No data available.")}</td></tr>
                    )}
                    {agingRows.map((r) => {
                      const sev = r.ageDays > 30 ? "overdue" : r.ageDays > 7 ? "aging" : "fresh";
                      return (
                        <tr key={r.orderInternalId}>
                          <td><strong>{r.orderCode}</strong></td>
                          <td>{r.customerName || "—"}</td>
                          <td><span className={`report-status report-status--${r.status}`}>{tr(`reports.status.${r.status}`, ORDER_STATUS_LABEL[r.status] || r.status)}</span></td>
                          <td>{formatDate(r.createdAt, appLocale)}</td>
                          <td className="is-num"><span className={`report-age report-age--${sev}`}>{r.ageDays}</span></td>
                          <td className="is-num">{r.items}</td>
                          <td className="is-num">{formatMoney(r.total, appLocale)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <p className="report-view__note"><FaCircleInfo aria-hidden="true" />{tr("reports.noteAging", "Open = not done and not cancelled. Age is days since the order was created; oldest first.")}</p>
            </div>
          )}

          {/* ===== Cancellation rate ===== */}
          {activeReport && activeReport.status === "ready" && activeReport.id === "cancellation-rate" && (
            <div className="report-view">
              <div className="report-view__bar">
                <div>
                  <h2>{tr("reports.item.cancellation-rate.name", "Cancellation rate")}</h2>
                  <p>{tr("reports.item.cancellation-rate.desc", "Share of appointments that were cancelled or rejected.")}</p>
                </div>
                <ExportButtons tr={tr} onExport={handleExport} />
              </div>

              <SummaryTiles
                tiles={[
                  { label: tr("reports.tiles.totalAppointments", "Total appointments"), value: cancelSummary.total },
                  { label: tr("reports.tiles.cancelled", "Cancelled"), value: cancelSummary.cancelled, variant: "cancelled" },
                  { label: tr("reports.tiles.cancelRate", "Cancellation rate"), value: `${cancelSummary.ratePct}%`, variant: "revenue" },
                ]}
              />

              <div className="report-view__filters">
                <PeriodFilter tr={tr} period={period} setPeriod={setPeriod} from={customFrom} to={customTo} setFrom={setCustomFrom} setTo={setCustomTo} />
                <button type="button" className="report-view__reset" onClick={resetFilters}>{tr("reports.actions.reset", "Reset")}</button>
              </div>

              <div className="report-table-wrap">
                <table className="report-table">
                  <thead>
                    <tr>
                      <th>{tr("reports.columns.month", "Month")}</th>
                      <th className="is-num">{tr("reports.columns.total", "Total")}</th>
                      <th className="is-num">{tr("reports.columns.cancelled", "Cancelled")}</th>
                      <th className="is-num">{tr("reports.columns.rate", "Rate")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cancelMonths.length === 0 && (
                      <tr><td colSpan={4} className="report-table__empty">{tr("reports.noData", "No data available.")}</td></tr>
                    )}
                    {cancelMonths.map((m) => (
                      <tr key={m.period}>
                        <td><strong>{m.period}</strong></td>
                        <td className="is-num">{m.total}</td>
                        <td className="is-num">{m.cancelled}</td>
                        <td className="is-num">{m.ratePct}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <p className="report-view__note"><FaCircleInfo aria-hidden="true" />{tr("reports.noteCancel", "Cancelled counts CANCELLED and REJECTED appointments. There is no separate no-show status.")}</p>
            </div>
          )}

          {/* ===== Revenue over time ===== */}
          {activeReport && activeReport.status === "ready" && activeReport.id === "revenue-over-time" && (
            <div className="report-view">
              <div className="report-view__bar">
                <div>
                  <h2>{tr("reports.item.revenue-over-time.name", "Revenue over time")}</h2>
                  <p>{tr("reports.item.revenue-over-time.desc", "Order revenue by period (excludes cancelled).")}</p>
                </div>
                <ExportButtons tr={tr} onExport={handleExport} />
              </div>

              <SummaryTiles
                tiles={[
                  { label: tr("reports.tiles.revenue", "Revenue"), value: formatMoney(revSummary.totalRevenue, appLocale), variant: "revenue" },
                  { label: tr("reports.tiles.orders", "Orders"), value: revSummary.totalOrders },
                  { label: tr("reports.tiles.avgOrder", "Avg order value"), value: formatMoney(revSummary.avgOrderValue, appLocale) },
                  { label: tr("reports.tiles.bestPeriod", "Best period"), value: revSummary.bestPeriod },
                ]}
              />

              <div className="report-view__filters">
                <label className="report-filter">
                  <span>{tr("reports.filters.granularity", "Group by")}</span>
                  <select value={granularity} onChange={(e) => setGranularity(e.target.value)}>
                    <option value="day">{tr("reports.granularity.day", "Day")}</option>
                    <option value="week">{tr("reports.granularity.week", "Week")}</option>
                    <option value="month">{tr("reports.granularity.month", "Month")}</option>
                  </select>
                </label>
                <PeriodFilter tr={tr} period={period} setPeriod={setPeriod} from={customFrom} to={customTo} setFrom={setCustomFrom} setTo={setCustomTo} />
                <button type="button" className="report-view__reset" onClick={resetFilters}>{tr("reports.actions.reset", "Reset")}</button>
              </div>

              <div className="report-dist">
                <h3>{tr("reports.revenueByPeriod", "Revenue by period")}</h3>
                {revPoints.length === 0 && (
                  <p className="reports__catalog-empty">{tr("reports.noData", "No data available.")}</p>
                )}
                {revPoints.map((p) => {
                  const pct = revMax > 0 ? Math.round((p.revenue / revMax) * 100) : 0;
                  return (
                    <div className="report-dist__row" key={p.period}>
                      <span className="report-dist__label">{p.period}</span>
                      <span className="report-dist__track">
                        <span className="report-dist__fill report-dist__fill--done" style={{ width: `${pct}%` }} />
                      </span>
                      <span className="report-dist__value">{formatMoney(p.revenue, appLocale)}</span>
                    </div>
                  );
                })}
              </div>

              <div className="report-table-wrap">
                <table className="report-table">
                  <thead>
                    <tr>
                      <th>{tr("reports.columns.period", "Period")}</th>
                      <th className="is-num">{tr("reports.columns.orders", "Orders")}</th>
                      <th className="is-num">{tr("reports.columns.revenue", "Revenue")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {revPoints.length === 0 && (
                      <tr><td colSpan={3} className="report-table__empty">{tr("reports.noData", "No data available.")}</td></tr>
                    )}
                    {revPoints.map((p) => (
                      <tr key={p.period}>
                        <td><strong>{p.period}</strong></td>
                        <td className="is-num">{p.orders}</td>
                        <td className="is-num">{formatMoney(p.revenue, appLocale)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <p className="report-view__note"><FaCircleInfo aria-hidden="true" />{tr("reports.noteRevenue", "Revenue sums order totals, excluding cancelled orders. Each row is one period bucket.")}</p>
            </div>
          )}
        </div>
      </div>
      <PlansModal
        show={showPlans}
        onClose={() => setShowPlans(false)}
        companyId={resolvedCompanyId}
        reason={tr("plans.reports.reason", "The reports you selected are included in the Basic, Pro, Enterprise and Trial plans.")}
      />
    </section>
  );
}