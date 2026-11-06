import { useEffect, useMemo, useState } from "react";
import SearchWebOrdersService from "../services/SearchWebOrdersService";
import WebOrderActionsService from "../services/WebOrderActionsService";
import {
  FaArrowRotateLeft,
  FaBoxOpen,
  FaCalendarDays,
  FaCircleCheck,
  FaCircleXmark,
  FaClock,
  FaEnvelope,
  FaEye,
  FaFileLines,
  FaFilter,
  FaLayerGroup,
  FaLocationDot,
  FaMagnifyingGlass,
  FaPhone,
  FaRoute,
  FaTriangleExclamation,
  FaUserCheck,
  FaUserSecret,
  FaXmark,
} from "react-icons/fa6";
import "./WebOrderApproval.scss";

const relativeDate = ({ days = 0, hours = 0, minutes = 0 }) => {
  const date = new Date();
  date.setSeconds(0, 0);
  date.setDate(date.getDate() - days);
  date.setHours(date.getHours() - hours);
  date.setMinutes(date.getMinutes() - minutes);
  return date.toISOString();
};

// Replace this collection with the public web-order inbox service.
// Booking records intentionally remain here only to demonstrate that this
// component excludes them and sends them to the separate booking workflow.


const searchWebOrdersService = new SearchWebOrdersService();
const webOrderActionsService = new WebOrderActionsService();
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

// Map a backend web-order row to the shape this screen renders.
function mapWebOrderRow(row, companyId) {
  const requesterType = String(row.requesterType || row.requester_type || "").toUpperCase();
  const useRegistered =
    row.useRegisteredCustomer === true ||
    row.use_registered_customer === true;
  // Prefer requester_type; fall back to use_registered_customer when the
  // requester_type was not captured at save time.
  const isPlatformUser =
    requesterType === "PLATFORM_USER" || (requesterType !== "GUEST" && useRegistered) || (requesterType === "GUEST" && useRegistered);
  return {
    id: String(row.webOrderRequestId || row.web_order_request_id || ""),
    requestNumber: String(row.requestCode || row.request_code || ""),
    companyId: String(companyId || ""),
    requestKind: "order",
    orderType: String(row.orderType || row.order_type || "product").toLowerCase(),
    status: String(row.status || "pending").toLowerCase(),
    requestedAt: row.createdAt || row.created_at || null,
    // guest vs platform user.
    customerType: isPlatformUser ? "registered" : "guest",
    customerId: row.customerId || row.customer_id || row.userCode || null,
    customerName: String(row.customerName || row.customer_name || ""),
    email: row.email || "",
    phone: row.phone || "",
    region: row.region || "",
    itemCode: row.firstItemCode || row.first_item_code || "",
    itemName: row.firstItemName || row.first_item_name || "",
    quantity: Number(row.totalQuantity ?? row.total_quantity ?? 0) || 0,
    amount: Number(row.total ?? 0) || 0,
    currency: "USD",
    workflowName: "",
    notes: "",
  };
}

const MOCK_WEB_REQUESTS = [
  {
    id: "web-2048",
    requestNumber: "WEB-2048",
    companyId: "company-001",
    requestKind: "order",
    orderType: "product",
    status: "pending",
    requestedAt: relativeDate({ hours: 5, minutes: 18 }),
    customerType: "guest",
    customerId: null,
    customerName: "Andrea Vargas Solano",
    email: "andrea.vargas@example.com",
    phone: "+506 8812-3401",
    region: "sanJose",
    itemCode: "WCB-3040",
    itemName: "Walnut Cutting Board",
    quantity: 2,
    amount: 150,
    currency: "USD",
    workflowName: "Standard wood product",
    notes: "Please confirm whether both boards can include gift packaging.",
  },
  {
    id: "web-2047",
    requestNumber: "WEB-2047",
    companyId: "company-001",
    requestKind: "order",
    orderType: "service",
    status: "pending",
    requestedAt: relativeDate({ hours: 3, minutes: 42 }),
    customerType: "registered",
    customerId: "CUS-0184",
    customerName: "Carlos Jiménez Mora",
    email: "carlos.jimenez@example.com",
    phone: "+506 8700-1142",
    region: "heredia",
    itemCode: "RESTORE-01",
    itemName: "Wood Restoration Assessment",
    quantity: 1,
    amount: null,
    currency: "USD",
    workflowName: "Restoration service",
    notes: "The dining table has water damage on one corner. Photos are available.",
  },
  {
    id: "web-2046",
    requestNumber: "WEB-2046",
    companyId: "company-001",
    requestKind: "order",
    orderType: "product",
    status: "approved",
    requestedAt: relativeDate({ hours: 8, minutes: 10 }),
    processedAt: relativeDate({ hours: 7, minutes: 25 }),
    customerType: "registered",
    customerId: "CUS-0092",
    customerName: "María Fernanda Rojas",
    email: "maria.rojas@example.com",
    phone: "+506 8301-2260",
    region: "alajuela",
    itemCode: "CHB-5030",
    itemName: "Charcuterie Board",
    quantity: 1,
    amount: 78,
    currency: "USD",
    workflowName: "Standard wood product",
    notes: "No engraving is required.",
    orderReference: "ORD-2026-1038",
    trackingReference: "TRK-2026-1038",
  },
  {
    id: "web-2045",
    requestNumber: "WEB-2045",
    companyId: "company-001",
    requestKind: "order",
    orderType: "product",
    status: "rejected",
    requestedAt: relativeDate({ days: 1, hours: 2 }),
    processedAt: relativeDate({ days: 1, hours: 1 }),
    customerType: "guest",
    customerId: null,
    customerName: "Daniel Chaves Ruiz",
    email: "daniel.chaves@example.com",
    phone: "+506 8990-4120",
    region: "cartago",
    itemCode: "DSK-11055",
    itemName: "Compact Writing Desk",
    quantity: 5,
    amount: 1300,
    currency: "USD",
    workflowName: "Furniture production",
    notes: "Requested delivery within two days.",
    rejectionReason: "The requested delivery date cannot be fulfilled.",
  },
  {
    id: "web-2044",
    requestNumber: "WEB-2044",
    companyId: "company-001",
    requestKind: "order",
    orderType: "service",
    status: "pending",
    requestedAt: relativeDate({ days: 2, hours: 4 }),
    customerType: "guest",
    customerId: null,
    customerName: "Sofía Méndez Araya",
    email: "sofia.mendez@example.com",
    phone: "+506 8455-7810",
    region: "guanacaste",
    itemCode: "ENG-CUSTOM",
    itemName: "Custom Engraving Service",
    quantity: 1,
    amount: null,
    currency: "USD",
    workflowName: "Custom engraving",
    notes: "Engraving is required for twelve existing serving boards.",
  },
  {
    id: "web-2043",
    requestNumber: "WEB-2043",
    companyId: "company-001",
    requestKind: "order",
    orderType: "product",
    status: "approved",
    requestedAt: relativeDate({ days: 5, hours: 3 }),
    processedAt: relativeDate({ days: 5, hours: 2 }),
    customerType: "guest",
    customerId: null,
    customerName: "Luis Diego Brenes",
    email: "luis.brenes@example.com",
    phone: "+506 8611-9002",
    region: "sanJose",
    itemCode: "SGN-6040",
    itemName: "Personalized Wooden Sign",
    quantity: 1,
    amount: 70,
    currency: "USD",
    workflowName: "Personalized product",
    notes: "The final artwork will be sent by email.",
    orderReference: "ORD-2026-1029",
    trackingReference: "TRK-2026-1029",
  },
  {
    id: "web-2042",
    requestNumber: "WEB-2042",
    companyId: "company-001",
    requestKind: "booking",
    orderType: "service",
    status: "pending",
    requestedAt: relativeDate({ hours: 1 }),
    customerType: "registered",
    customerId: "CUS-0201",
    customerName: "Gabriela Salas",
    email: "gabriela.salas@example.com",
    phone: "+506 8822-0041",
    region: "sanJose",
    itemCode: "CONSULT-01",
    itemName: "Custom Furniture Consultation",
    quantity: 1,
    amount: null,
    currency: "USD",
    workflowName: "Booking request",
    notes: "This request belongs to the booking approval module.",
  },
];

const INITIAL_FILTERS = {
  search: "",
  period: "all",
  region: "all",
  status: "pending",
  customerType: "all",
  orderType: "all",
};

const REGIONS = ["sanJose", "alajuela", "heredia", "cartago", "guanacaste"];

const startOfDay = (value) => {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
};

const matchesPeriod = (dateValue, period) => {
  if (period === "all") return true;

  const requestDate = startOfDay(dateValue);
  const today = startOfDay(new Date());
  const difference = Math.floor((today - requestDate) / 86400000);

  if (period === "today") return difference === 0;
  if (period === "yesterday") return difference === 1;
  if (period === "last7") return difference >= 0 && difference <= 6;
  if (period === "last30") return difference >= 0 && difference <= 29;
  return true;
};

const createReference = (prefix) =>
  `${prefix}-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;

export default function WebOrderApproval({ t, locale = "en-US" }) {
  const [orders, setOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [ordersError, setOrdersError] = useState("");

  // Load the real web orders for the active company.
  useEffect(() => {
    const companyId = readSelectedCompanyId();
    if (!companyId) {
      setOrdersError("No company is selected.");
      return undefined;
    }
    let active = true;
    setLoadingOrders(true);
    setOrdersError("");

    searchWebOrdersService
      .getWebOrders({ companyId, filters: {} })
      .then((rows) => {
        if (!active) return;
        setOrders((Array.isArray(rows) ? rows : []).map((row) => mapWebOrderRow(row, companyId)));
      })
      .catch((error) => {
        if (!active) return;
        console.error("Error loading web orders:", error);
        setOrders([]);
        setOrdersError(error?.message || "Could not load web orders.");
      })
      .finally(() => {
        if (active) setLoadingOrders(false);
      });

    return () => {
      active = false;
    };
  }, []);
  const [filters, setFilters] = useState(INITIAL_FILTERS);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [dialogMode, setDialogMode] = useState(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [actionBusy, setActionBusy] = useState(false);
  const [notice, setNotice] = useState(null);

  const nonBookingOrders = useMemo(
    () => orders.filter((order) => order.requestKind === "order"),
    [orders],
  );

  const excludedBookingCount = orders.filter(
    (order) => order.requestKind === "booking",
  ).length;

  const filteredOrders = useMemo(() => {
    const search = filters.search.trim().toLowerCase();

    return nonBookingOrders
      .filter((order) => {
        const searchable = [
          order.requestNumber,
          order.customerName,
          order.customerId,
          order.email,
          order.phone,
          order.itemCode,
          order.itemName,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        return (
          (!search || searchable.includes(search)) &&
          matchesPeriod(order.requestedAt, filters.period) &&
          (filters.status === "all" || order.status === filters.status) &&
          (filters.customerType === "all" ||
            order.customerType === filters.customerType) &&
          true
        );
      })
      .sort(
        (first, second) =>
          new Date(first.requestedAt) - new Date(second.requestedAt),
      );
  }, [filters, nonBookingOrders]);

  const summary = useMemo(
    () => ({
      pending: nonBookingOrders.filter((order) => order.status === "pending").length,
      registered: nonBookingOrders.filter(
        (order) => order.customerType === "registered",
      ).length,
      guests: nonBookingOrders.filter((order) => order.customerType === "guest").length,
      approvedToday: nonBookingOrders.filter(
        (order) =>
          order.status === "approved" &&
          order.processedAt &&
          matchesPeriod(order.processedAt, "today"),
      ).length,
    }),
    [nonBookingOrders],
  );

  const updateFilter = (event) => {
    const { name, value } = event.target;
    setFilters((current) => ({ ...current, [name]: value }));
  };

  const resetFilters = () => setFilters(INITIAL_FILTERS);

  const openDialog = (order, mode) => {
    setSelectedOrder(order);
    setDialogMode(mode);
    setRejectionReason(order.rejectionReason || "");
  };

  const closeDialog = () => {
    setSelectedOrder(null);
    setDialogMode(null);
    setRejectionReason("");
  };

  const approveOrder = async () => {
    if (!selectedOrder) return;
    const companyId = readSelectedCompanyId();
    if (!companyId) {
      setNotice({ type: "warning", message: "No company is selected." });
      return;
    }

    setActionBusy(true);
    try {
      const response = await webOrderActionsService.approve({
        companyId,
        webOrderRequestId: selectedOrder.id,
      });
      const orderReference =
        response?.result?.createdOrder?.order?.orderInternalId ||
        response?.result?.createdOrder?.order?.order_internal_id ||
        "";

      // Update the row locally to reflect APPROVED.
      setOrders((current) =>
        current.map((order) =>
          order.id === selectedOrder.id
            ? { ...order, status: "approved", processedAt: new Date().toISOString(), orderReference, rejectionReason: undefined }
            : order,
        ),
      );

      setNotice({
        type: "success",
        message: t("webOrderApproval.messages.approved", {
          defaultValue: "Request {request} approved. Order created.",
          request: selectedOrder.requestNumber,
          order: orderReference,
          tracking: "",
        }).replace("{request}", selectedOrder.requestNumber),
      });
      closeDialog();
    } catch (error) {
      console.error("Approve failed:", error);
      setNotice({
        type: "warning",
        message: error?.message ||
          t("webOrderApproval.messages.approveError", {
            defaultValue: "The request could not be approved. Please try again.",
          }),
      });
    } finally {
      setActionBusy(false);
    }
  };

  const rejectOrder = async () => {
    if (!selectedOrder || !rejectionReason.trim()) return;
    const companyId = readSelectedCompanyId();
    if (!companyId) {
      setNotice({ type: "warning", message: "No company is selected." });
      return;
    }

    setActionBusy(true);
    try {
      await webOrderActionsService.reject({
        companyId,
        webOrderRequestId: selectedOrder.id,
      });

      setOrders((current) =>
        current.map((order) =>
          order.id === selectedOrder.id
            ? { ...order, status: "rejected", processedAt: new Date().toISOString(), rejectionReason: rejectionReason.trim() }
            : order,
        ),
      );

      setNotice({
        type: "warning",
        message: t("webOrderApproval.messages.rejected", {
          request: selectedOrder.requestNumber,
        }),
      });
      closeDialog();
    } catch (error) {
      console.error("Reject failed:", error);
      setNotice({
        type: "warning",
        message: error?.message ||
          t("webOrderApproval.messages.rejectError", {
            defaultValue: "The request could not be rejected. Please try again.",
          }),
      });
    } finally {
      setActionBusy(false);
    }
  };

  const formatDate = (value) =>
    new Intl.DateTimeFormat(locale, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));

  const formatAmount = (order) => {
    if (order.amount === null || order.amount === undefined) {
      return t("webOrderApproval.labels.toConfirm");
    }

    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: order.currency,
    }).format(order.amount);
  };

  const statusLabel = (status) => t(`webOrderApproval.status.${status}`);
  const customerTypeLabel = (type) =>
    t(`webOrderApproval.customerType.${type}`);

  return (
    <main className="web-order-approval">
      <section className="web-order-approval__header">
        <div>
          <span className="web-order-approval__eyebrow">
            {t("webOrderApproval.eyebrow")}
          </span>
          <h1>{t("webOrderApproval.title")}</h1>
          <p>{t("webOrderApproval.subtitle")}</p>
        </div>

        {/* 2026-10-30: the "Current company" card was removed: it showed a demo
            name ("Maderas Finas CR"); the header shows the real company. */}
      </section>

      <section className="web-order-summary" aria-label={t("webOrderApproval.summary.label")}>
        <article>
          <span className="summary-icon summary-icon--pending"><FaClock /></span>
          <div><strong>{summary.pending}</strong><span>{t("webOrderApproval.summary.pending")}</span></div>
        </article>
        <article>
          <span className="summary-icon summary-icon--registered"><FaUserCheck /></span>
          <div><strong>{summary.registered}</strong><span>{t("webOrderApproval.summary.registered")}</span></div>
        </article>
        <article>
          <span className="summary-icon summary-icon--guest"><FaUserSecret /></span>
          <div><strong>{summary.guests}</strong><span>{t("webOrderApproval.summary.guests")}</span></div>
        </article>
        <article>
          <span className="summary-icon summary-icon--approved"><FaCircleCheck /></span>
          <div><strong>{summary.approvedToday}</strong><span>{t("webOrderApproval.summary.approvedToday")}</span></div>
        </article>
      </section>

      {excludedBookingCount > 0 && (
        <aside className="booking-exclusion-note">
          <FaCalendarDays />
          <div>
            <strong>{t("webOrderApproval.booking.title")}</strong>
            <p>
              {t("webOrderApproval.booking.description", {
                count: excludedBookingCount,
              })}
            </p>
          </div>
        </aside>
      )}

      {notice && (
        <div className={`web-order-notice web-order-notice--${notice.type}`} role="status">
          {notice.type === "success" ? <FaCircleCheck /> : <FaTriangleExclamation />}
          <span>{notice.message}</span>
          <button type="button" onClick={() => setNotice(null)} aria-label={t("webOrderApproval.actions.close")}>
            <FaXmark />
          </button>
        </div>
      )}

      <section className="web-order-filters">
        <div className="web-order-filters__heading">
          <span><FaFilter /></span>
          <div>
            <h2>{t("webOrderApproval.filters.title")}</h2>
            <p>{t("webOrderApproval.filters.description")}</p>
          </div>
          <button type="button" className="filter-reset" onClick={resetFilters}>
            <FaArrowRotateLeft />
            {t("webOrderApproval.actions.reset")}
          </button>
        </div>

        <div className="web-order-filters__grid">
          <label className="filter-search">
            <span>{t("webOrderApproval.filters.search")}</span>
            <div>
              <FaMagnifyingGlass />
              <input
                name="search"
                value={filters.search}
                onChange={updateFilter}
                placeholder={t("webOrderApproval.filters.searchPlaceholder")}
              />
            </div>
          </label>

          <label>
            <span>{t("webOrderApproval.filters.period")}</span>
            <select name="period" value={filters.period} onChange={updateFilter}>
              <option value="all">{t("webOrderApproval.period.all")}</option>
              <option value="today">{t("webOrderApproval.period.today")}</option>
              <option value="yesterday">{t("webOrderApproval.period.yesterday")}</option>
              <option value="last7">{t("webOrderApproval.period.last7")}</option>
              <option value="last30">{t("webOrderApproval.period.last30")}</option>

            </select>
          </label>


          <label>
            <span>{t("webOrderApproval.filters.status")}</span>
            <select name="status" value={filters.status} onChange={updateFilter}>
              <option value="all">{t("webOrderApproval.options.allStatuses")}</option>
              <option value="pending">{t("webOrderApproval.status.pending")}</option>
              <option value="approved">{t("webOrderApproval.status.approved")}</option>
              <option value="rejected">{t("webOrderApproval.status.rejected")}</option>
            </select>
          </label>

          <label>
            <span>{t("webOrderApproval.filters.customerType")}</span>
            <select name="customerType" value={filters.customerType} onChange={updateFilter}>
              <option value="all">{t("webOrderApproval.options.allCustomers")}</option>
              <option value="registered">{t("webOrderApproval.customerType.registered")}</option>
              <option value="guest">{t("webOrderApproval.customerType.guest")}</option>
            </select>
          </label>

        </div>
      </section>

      <section className="web-order-list">
        <header>
          <div>
            <span><FaBoxOpen /></span>
            <div>
              <h2>{t("webOrderApproval.list.title")}</h2>
              <p>{t("webOrderApproval.list.resultCount", { count: filteredOrders.length })}</p>
            </div>
          </div>
          <small>{t("webOrderApproval.list.doubleClickTip")}</small>
        </header>

        <div className="web-order-table-wrap">
          <table>
            <thead>
              <tr>
                <th>{t("webOrderApproval.columns.request")}</th>
                <th>{t("webOrderApproval.columns.customer")}</th>
                <th>{t("webOrderApproval.columns.region")}</th>
                <th>{t("webOrderApproval.columns.item")}</th>
                <th>{t("webOrderApproval.columns.requestedAt")}</th>
                <th>{t("webOrderApproval.columns.status")}</th>
                <th className="actions-column">{t("webOrderApproval.columns.actions")}</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.map((order) => (
                <tr key={order.id} onDoubleClick={() => openDialog(order, "details")}>
                  <td>
                    <strong>{order.requestNumber}</strong>
                    <small>{t(`webOrderApproval.orderType.${order.orderType}`)}</small>
                  </td>
                  <td>
                    <div className="customer-cell">
                      <span className={`customer-type-icon customer-type-icon--${order.customerType}`}>
                        {order.customerType === "registered" ? <FaUserCheck /> : <FaUserSecret />}
                      </span>
                      <span>
                        <strong>{order.customerName}</strong>
                        <small>{order.customerId || t("webOrderApproval.labels.noAccount")}</small>
                        <em className={`identity-badge identity-badge--${order.customerType}`}>
                          {customerTypeLabel(order.customerType)}
                        </em>
                      </span>
                    </div>
                  </td>
                  <td><span className="region-cell"><FaLocationDot />{t(`webOrderApproval.region.${order.region}`)}</span></td>
                  <td>
                    <strong>{order.itemName}</strong>
                    <small>{order.itemCode} · {t("webOrderApproval.labels.quantity", { count: order.quantity })}</small>
                  </td>
                  <td><span className="date-cell"><FaClock />{formatDate(order.requestedAt)}</span></td>
                  <td><span className={`status-badge status-badge--${order.status}`}>{statusLabel(order.status)}</span></td>
                  <td>
                    <div className="row-actions">
                      <button type="button" className="icon-action" onClick={() => openDialog(order, "details")} title={t("webOrderApproval.actions.details")}>
                        <FaEye />
                      </button>
                      {order.status === "pending" && (
                        <>
                          <button type="button" className="row-action row-action--approve" onClick={() => openDialog(order, "approve")}>
                            <FaCircleCheck />{t("webOrderApproval.actions.approve")}
                          </button>
                          <button type="button" className="row-action row-action--reject" onClick={() => openDialog(order, "reject")}>
                            <FaCircleXmark />{t("webOrderApproval.actions.reject")}
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {!filteredOrders.length && (
          <div className="web-order-empty">
            <FaMagnifyingGlass />
            <h3>{t("webOrderApproval.empty.title")}</h3>
            <p>{t("webOrderApproval.empty.description")}</p>
            <button type="button" onClick={resetFilters}>{t("webOrderApproval.actions.reset")}</button>
          </div>
        )}
      </section>

      {selectedOrder && dialogMode && (
        <div className="web-order-dialog-layer" role="dialog" aria-modal="true" aria-labelledby="web-order-dialog-title">
          <button type="button" className="web-order-dialog-backdrop" onClick={closeDialog} aria-label={t("webOrderApproval.actions.close")} />
          <section className="web-order-dialog">
            <header>
              <div>
                <span className="dialog-icon"><FaFileLines /></span>
                <div>
                  <small>{selectedOrder.requestNumber}</small>
                  <h2 id="web-order-dialog-title">
                    {dialogMode === "approve" && t("webOrderApproval.dialog.approveTitle")}
                    {dialogMode === "reject" && t("webOrderApproval.dialog.rejectTitle")}
                    {dialogMode === "details" && t("webOrderApproval.dialog.detailsTitle")}
                  </h2>
                </div>
              </div>
              <button type="button" onClick={closeDialog} aria-label={t("webOrderApproval.actions.close")}><FaXmark /></button>
            </header>

            <div className="web-order-dialog__body">
              <div className={`customer-identity customer-identity--${selectedOrder.customerType}`}>
                {selectedOrder.customerType === "registered" ? <FaUserCheck /> : <FaUserSecret />}
                <div>
                  <strong>{customerTypeLabel(selectedOrder.customerType)}</strong>
                  <p>
                    {selectedOrder.customerType === "registered"
                      ? t("webOrderApproval.dialog.registeredExplanation", { id: selectedOrder.customerId })
                      : t("webOrderApproval.dialog.guestExplanation")}
                  </p>
                </div>
              </div>

              <div className="dialog-detail-grid">
                <article><span>{t("webOrderApproval.details.customer")}</span><strong>{selectedOrder.customerName}</strong></article>
                <article><span>{t("webOrderApproval.details.region")}</span><strong>{t(`webOrderApproval.region.${selectedOrder.region}`)}</strong></article>
                <article><span>{t("webOrderApproval.details.email")}</span><strong><FaEnvelope />{selectedOrder.email || (<span className="no-email-badge">{t("webOrderApproval.details.noEmail")}</span>)}</strong></article>
                <article><span>{t("webOrderApproval.details.phone")}</span><strong><FaPhone />{selectedOrder.phone}</strong></article>
                <article><span>{t("webOrderApproval.details.item")}</span><strong>{selectedOrder.itemName}</strong></article>
                <article><span>{t("webOrderApproval.details.amount")}</span><strong>{formatAmount(selectedOrder)}</strong></article>
                <article><span>{t("webOrderApproval.details.requestedAt")}</span><strong>{formatDate(selectedOrder.requestedAt)}</strong></article>
                <article><span>{t("webOrderApproval.details.workflow")}</span><strong>{selectedOrder.workflowName}</strong></article>
              </div>

              <section className="order-notes">
                <span>{t("webOrderApproval.details.notes")}</span>
                <p>{selectedOrder.notes || t("webOrderApproval.labels.noNotes")}</p>
              </section>

              {selectedOrder.orderReference && (
                <section className="created-flow-card">
                  <FaRoute />
                  <div>
                    <strong>{t("webOrderApproval.dialog.flowCreated")}</strong>
                    <p>{t("webOrderApproval.details.orderReference")}: {selectedOrder.orderReference}</p>
                    <p>{t("webOrderApproval.details.trackingReference")}: {selectedOrder.trackingReference}</p>
                  </div>
                </section>
              )}

              {dialogMode === "approve" && (
                <section className="approval-preview">
                  <FaLayerGroup />
                  <div>
                    <strong>{t("webOrderApproval.dialog.approvalEffectTitle")}</strong>
                    <p>{t("webOrderApproval.dialog.approvalEffectDescription", { workflow: selectedOrder.workflowName })}</p>
                  </div>
                </section>
              )}

              {dialogMode === "reject" && (
                <label className="rejection-field">
                  <span>{t("webOrderApproval.dialog.rejectionReason")}</span>
                  <textarea
                    rows="4"
                    value={rejectionReason}
                    onChange={(event) => setRejectionReason(event.target.value)}
                    placeholder={t("webOrderApproval.dialog.rejectionPlaceholder")}
                    autoFocus
                  />
                  <small>{t("webOrderApproval.dialog.rejectionHelp")}</small>
                </label>
              )}

              {selectedOrder.rejectionReason && dialogMode === "details" && (
                <section className="rejection-summary">
                  <FaCircleXmark />
                  <div><strong>{t("webOrderApproval.dialog.rejectionReason")}</strong><p>{selectedOrder.rejectionReason}</p></div>
                </section>
              )}
            </div>

            <footer>
              <button type="button" className="dialog-button dialog-button--secondary" onClick={closeDialog}>
                {dialogMode === "details" ? t("webOrderApproval.actions.close") : t("webOrderApproval.actions.cancel")}
              </button>
              {dialogMode === "approve" && (
                <button type="button" className="dialog-button dialog-button--approve" onClick={approveOrder}>
                  <FaCircleCheck />{t("webOrderApproval.actions.confirmApproval")}
                </button>
              )}
              {dialogMode === "reject" && (
                <button type="button" className="dialog-button dialog-button--reject" onClick={rejectOrder} disabled={!rejectionReason.trim()}>
                  <FaCircleXmark />{t("webOrderApproval.actions.confirmRejection")}
                </button>
              )}
            </footer>
          </section>
        </div>
      )}
    </main>
  );
}