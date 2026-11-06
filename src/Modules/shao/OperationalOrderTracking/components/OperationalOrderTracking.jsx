import { useEffect, useMemo, useRef, useState } from "react";
import {
  FaArrowRotateLeft,
  FaCircleInfo,
  FaMagnifyingGlass,
  FaPaperclip,
  FaPlus,
  FaTrash,
  FaXmark,
  FaListCheck,
  FaBan,
  FaAddressCard,
  FaLocationDot,
  FaClockRotateLeft,
} from "react-icons/fa6";
import "./OperationalOrderTracking.scss";
import OrderTrackingService from "../services/OrderTrackingService";
import OrderItemTrackingService from "../services/OrderItemTrackingService";
import OrderDetailsService from "../services/OrderDetailsService";
import OrderDetailsAttachmentUploadService from "../services/OrderDetailsAttachmentUploadService";

const SELECTED_COMPANY_STORAGE_KEY = "selectedCompany";

const orderTrackingService = new OrderTrackingService();
const orderItemTrackingService = new OrderItemTrackingService();
const orderDetailsService = new OrderDetailsService();
const orderDetailsUploadService = new OrderDetailsAttachmentUploadService();

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


// "pending" is a virtual filter: the active, not-finished statuses shown together.
const PENDING_STATUSES = ["placed", "inProgress", "partialDone"];

const STATUS_OPTIONS = [
  { value: "placed", labelKey: "operationalTracking.status.placed" },
  { value: "inProgress", labelKey: "operationalTracking.status.inProgress" },
  { value: "partialDone", labelKey: "operationalTracking.status.partialDone" },
  { value: "done", labelKey: "operationalTracking.status.done" },
  { value: "cancelled", labelKey: "operationalTracking.status.cancelled" },
];



// The list uses the real order ID. Never substitute a display number for API writes.
const pick = (row, ...names) => names.map((name) => row?.[name]).find((value) => value !== undefined && value !== null && value !== "");
const asText = (value) => String(value ?? "").trim();
const normalizedStatus = (value) => {
  const raw = asText(value);
  const key = raw.replace(/[\s_-]/g, "").toLowerCase();
  return ({
    placed: "placed", pending: "placed", scheduled: "placed",
    inprogress: "inProgress", confirmed: "inProgress",
    partialdone: "partialDone",
    done: "done", completed: "done",
    cancelled: "cancelled", canceled: "cancelled", void: "cancelled", rejected: "cancelled",
  })[key] || "placed";
};
const inactiveStatuses = new Set(["completed", "cancelled", "canceled", "rejected", "void", "closed"]);
const datePart = (value) => asText(value).slice(0, 10);

export function mapOperationalOrder(row) {
  const id = asText(pick(row, "orderInternalId", "order_internal_id", "orderId", "order_id"));
  if (!id) return null; // skip rows without a real id (filtered out by the loader)
  const items = pick(row, "items", "orderItems", "order_items");
  const firstItem = Array.isArray(items) ? items[0] : undefined;
  const status = normalizedStatus(pick(row, "status", "orderStatus", "order_status", "trackingStatus")) || "placed";
  return {
    id,
    orderInternalId: id,
    displayNumber: asText(pick(row, "orderNumber", "order_number", "orderCode", "order_code", "requestCode")) || id,
    orderName: asText(pick(row, "orderName", "order_name", "name", "description", "title")) ||
      asText(pick(firstItem, "itemName", "productName", "name")) || id,
    customer: asText(pick(row, "customerName", "customer_name", "clientName", "client_name")) || asText(row?.customer?.name),
    product: asText(pick(row, "productName", "product_name", "itemName", "item_name")) ||
      asText(pick(firstItem, "productName", "itemName", "name")),
    category: asText(pick(row, "category", "categoryName", "category_name")) || asText(pick(firstItem, "categoryName", "category")),
    type: asText(pick(row, "orderType", "order_type", "type")).toLowerCase() === "service" ? "service" : "product",
    orderDate: datePart(pick(row, "orderDate", "order_date", "createdAt", "created_at", "dateCreated")),
    deliveryDate: datePart(pick(row, "deliveryDate", "delivery_date", "dueDate", "due_date")),
    followUpDate: datePart(pick(row, "followUpDate", "follow_up_date")),
    role: asText(pick(row, "role", "responsibleRole", "responsible_role")),
    responsible: asText(pick(row, "responsible", "responsibleName", "responsible_name")),
    hasBooking: [true, 1, "1", "true"].includes(pick(row, "hasBooking", "has_booking")) || Boolean(pick(row, "bookingId", "booking_id")),
    status,
    stageId: "",
    stageName: "",
    stageDate: null,
    comments: [],
    attachments: [],
    history: [],
    items: (Array.isArray(items) ? items : []).map((it, index) => ({
      id: asText(pick(it, "orderItemId", "order_item_id", "id")) || `item-${index}`,
      productId: asText(pick(it, "productId", "product_id")),
      productName: asText(pick(it, "productName", "product_name", "name")) || "Item",
      productCode: asText(pick(it, "productCode", "product_code", "code", "internalCode")),
      quantity: Number(pick(it, "quantity", "qty")) || 1,
      stage: asText(pick(it, "stage", "trackingStatus", "tracking_status")) || "",
    })),
  };
}

function mapStageBundle(raw) {
  const stage = raw?.stage && typeof raw.stage === "object" ? raw.stage : raw;
  const comments = Array.isArray(raw?.comments) ? raw.comments : [];
  const attachments = Array.isArray(raw?.attachments) ? raw.attachments : [];
  return {
    stageId: asText(pick(stage, "orderTrackingId", "order_tracking_id")),
    stageName: asText(pick(stage, "stage", "stageName", "stage_name")),
    stageDate: pick(stage, "stageDate", "stage_date") || null,
    status: normalizedStatus(pick(stage, "status")),
    comments: comments.map((item, index) => ({
      id: pick(item, "orderTrackingCommentId", "order_tracking_comment_id", "id") || `comment-${index}`,
      author: asText(pick(item, "author")), text: asText(pick(item, "text")),
      date: pick(item, "createdAt", "created_at", "commentDate", "comment_date") || null,
    })),
    attachments: attachments.map((item, index) => ({
      id: pick(item, "orderTrackingAttachmentId", "order_tracking_attachment_id", "id") || `file-${index}`,
      name: asText(pick(item, "fileName", "file_name", "name")),
      size: Number(pick(item, "fileSize", "file_size", "size")) || 0,
      url: asText(pick(item, "url")),
      storagePath: asText(pick(item, "storagePath", "storage_path", "path")),
      fileType: asText(pick(item, "fileType", "file_type", "type")),
    })),
  };
}

const EMPTY_FILTERS = {
  customer: "",
  startDate: "",
  endDate: "",
  category: "",
  type: "",
  orderName: "",
  product: "",
  booking: "",
  role: "",
  status: "pending",
};

const filterAndSortOrders = (orders, criteria) => {
  const includes = (value, term) => asText(value).toLowerCase().includes(term.trim().toLowerCase());

  return [...orders]
    .filter((order) => !criteria.customer || order.customer === criteria.customer)
    .filter((order) => !criteria.startDate || order.orderDate >= criteria.startDate)
    .filter((order) => !criteria.endDate || order.orderDate <= criteria.endDate)
    .filter((order) => !criteria.category || order.category === criteria.category)
    .filter((order) => !criteria.type || order.type === criteria.type)
    .filter((order) => !criteria.orderName || includes(`${order.id} ${order.orderName}`, criteria.orderName))
    .filter((order) => !criteria.product || includes(order.product, criteria.product))
    .filter((order) => !criteria.role || order.role === criteria.role)
    .filter((order) => {
      if (!criteria.status) return true;
      if (criteria.status === "pending") return PENDING_STATUSES.includes(order.status);
      return order.status === criteria.status;
    })
    .filter((order) => !criteria.booking || order.hasBooking === (criteria.booking === "yes"))
    .sort((a, b) => a.orderDate.localeCompare(b.orderDate) || a.id.localeCompare(b.id));
};

export default function OperationalOrderTracking({ t, locale = "en-US" }) {
  const [orders, setOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [loadingError, setLoadingError] = useState("");
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState(EMPTY_FILTERS);
  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const [newComment, setNewComment] = useState("");
  const [details, setDetails] = useState({ comments: [], attachments: [] });
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsSaving, setDetailsSaving] = useState(false);
  const [detailsError, setDetailsError] = useState("");
  const [contactOpen, setContactOpen] = useState(false);
  const [message, setMessage] = useState("");
  const fileInputRef = useRef(null);

  const [itemsOrderId, setItemsOrderId] = useState(null); // order whose items popup is open
  const [itemsTracking, setItemsTracking] = useState(null); // { orderStatus, items:[...] } from backend
  const [itemsLoading, setItemsLoading] = useState(false);
  const [itemsError, setItemsError] = useState("");
  const [itemSavingId, setItemSavingId] = useState("");
  const [timeline, setTimeline] = useState([]);
  const [timelineLoading, setTimelineLoading] = useState(false);
  const [historyOrderId, setHistoryOrderId] = useState(null); // order whose history popup is open

  // Load the main grid from the backend (orders list).
  useEffect(() => {
    const companyId = readSelectedCompanyId();
    if (!companyId) {
      setLoadingError("No company is selected.");
      return undefined;
    }
    const controller = new AbortController();
    let active = true;
    setLoadingOrders(true);
    setLoadingError("");

    orderTrackingService
      .searchOrders({ companyId, signal: controller.signal })
      .then((rows) => {
        if (!active) return;
        const mapped = (Array.isArray(rows) ? rows : [])
          .map(mapOperationalOrder)
          .filter(Boolean);
        setOrders(mapped);
      })
      .catch((error) => {
        if (!active || error?.name === "AbortError") return;
        console.error("Error loading orders:", error);
        setOrders([]);
        setLoadingError(error?.message || "Could not load orders.");
      })
      .finally(() => {
        if (active) setLoadingOrders(false);
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, []);

  const customers = useMemo(() => [...new Set(orders.map((order) => order.customer))].sort(), [orders]);
  const categories = useMemo(() => [...new Set(orders.map((order) => order.category))].sort(), [orders]);
  const roles = useMemo(() => [...new Set(orders.map((order) => order.role))].sort(), [orders]);

  const selectedOrder = orders.find((order) => order.id === selectedOrderId) || null;

  const visibleOrders = useMemo(
    () => filterAndSortOrders(orders, appliedFilters),
    [appliedFilters, orders],
  );

  const updateFilter = (event) => {
    const { name, value } = event.target;
    setFilters((current) => ({ ...current, [name]: value }));
  };

  const searchOrders = (event) => {
    event.preventDefault();
    setAppliedFilters(filters);
    const resultCount = filterAndSortOrders(orders, filters).length;
    setMessage(t("operationalTracking.messages.results", { count: resultCount }));
  };

  const clearFilters = () => {
    setFilters(EMPTY_FILTERS);
    setAppliedFilters(EMPTY_FILTERS);
    setMessage("");
  };

  const itemsOrder = orders.find((o) => o.id === itemsOrderId) || null;

  const loadItemsTracking = async (order) => {
    const companyId = readSelectedCompanyId();
    if (!companyId || !order) return;
    const orderInternalId = order.orderInternalId || order.id;
    setItemsLoading(true);
    setItemsError("");
    setItemsTracking(null);
    try {
      const view = await orderItemTrackingService.getByOrder({ companyId, orderInternalId });
      setItemsTracking(view);
    } catch (error) {
      console.error("Error loading item tracking:", error);
      setItemsError(error?.message || "Could not load the items.");
    } finally {
      setItemsLoading(false);
    }
  };

  const loadTimeline = async (order) => {
    const companyId = readSelectedCompanyId();
    if (!companyId || !order) return;
    const orderInternalId = order.orderInternalId || order.id;
    setTimelineLoading(true);
    setTimeline([]);
    try {
      const view = await orderItemTrackingService.getByOrder({ companyId, orderInternalId });
      setTimeline(Array.isArray(view?.history) ? view.history : []);
    } catch (error) {
      console.error("Error loading timeline:", error);
      setTimeline([]);
    } finally {
      setTimelineLoading(false);
    }
  };

  const openItems = (order) => {
    setItemsOrderId(order.id);
    loadItemsTracking(order);
  };
  const closeItems = () => {
    setItemsOrderId(null);
    setItemsTracking(null);
    setItemsError("");
  };

  // Save (or create first time) one item's step; backend recomputes order status.
  const saveItemStep = async (item, stepId) => {
    const companyId = readSelectedCompanyId();
    if (!companyId || !itemsOrder) return;
    const orderInternalId = itemsOrder.orderInternalId || itemsOrder.id;
    setItemSavingId(item.orderItemId);
    setItemsError("");
    try {
      const chosen = (item.stepOptions || []).find((o) => o.stepTemplateStepId === stepId);
      const view = await orderItemTrackingService.updateItemStep({
        companyId,
        orderInternalId,
        orderItemId: item.orderItemId,
        currentStepId: stepId,
        currentStepStatus: chosen ? (chosen.isDoneStep ? "done" : "inProgress") : "",
      });
      setItemsTracking(view);
      if (Array.isArray(view?.history)) setTimeline(view.history);
      // Reflect the recomputed order status in the grid.
      if (view?.orderStatus) {
        setOrders((current) =>
          current.map((o) =>
            (o.orderInternalId || o.id) === orderInternalId
              ? { ...o, status: normalizedStatus(view.orderStatus) }
              : o,
          ),
        );
      }
    } catch (error) {
      console.error("Error saving item step:", error);
      setItemsError(error?.message || "The item could not be saved.");
    } finally {
      setItemSavingId("");
    }
  };

  const historyOrder = orders.find((o) => o.id === historyOrderId) || null;
  const openHistory = (order) => {
    setHistoryOrderId(order.id);
    loadTimeline(order);
  };
  const closeHistory = () => setHistoryOrderId(null);


  // Cancel the order (mock): status becomes cancelled (final).
  const cancelOrder = (order) => {
    setOrders((current) =>
      current.map((o) => (o.id === order.id ? { ...o, status: "cancelled" } : o)),
    );
    setMessage(
      t("operationalTracking.messages.cancelled", { defaultValue: "Order cancelled." }),
    );
  };

  const orderIdOf = (order) => (order?.orderInternalId || order?.id);

  const loadDetails = async (order) => {
    const companyId = readSelectedCompanyId();
    if (!companyId || !order) return;
    setDetailsLoading(true);
    setDetailsError("");
    setDetails({ comments: [], attachments: [] });
    try {
      const view = await orderDetailsService.getDetails({ companyId, orderInternalId: orderIdOf(order) });
      setDetails({
        comments: Array.isArray(view?.comments) ? view.comments : [],
        attachments: Array.isArray(view?.attachments) ? view.attachments : [],
      });
    } catch (error) {
      console.error("Error loading order details:", error);
      setDetailsError(error?.message || "Could not load the details.");
    } finally {
      setDetailsLoading(false);
    }
  };

  const openDetails = (order) => {
    setSelectedOrderId(order.id);
    setNewComment("");
    loadDetails(order);   // whole-order comments + attachments
    loadTimeline(order);  // tracking timeline
  };

  const closeDetails = () => {
    setSelectedOrderId(null);
    setNewComment("");
    setDetails({ comments: [], attachments: [] });
    setDetailsError("");
    setContactOpen(false);
  };

  // Build a maps URL from coordinates (preferred) or the address text.
  const contactMapUrl = (c) => {
    if (!c) return "";
    const hasCoords = c.latitude != null && c.longitude != null && String(c.latitude) !== "" && String(c.longitude) !== "";
    if (hasCoords) return `https://www.google.com/maps/search/?api=1&query=${c.latitude},${c.longitude}`;
    if (c.address) return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(c.address)}`;
    return "";
  };

  const addComment = async () => {
    const text = newComment.trim();
    const companyId = readSelectedCompanyId();
    if (!text || !selectedOrder || !companyId) return;
    setDetailsSaving(true);
    setDetailsError("");
    try {
      const view = await orderDetailsService.addComment({
        companyId, orderInternalId: orderIdOf(selectedOrder), commentText: text,
      });
      if (view) setDetails(view);
      setNewComment("");
    } catch (error) {
      console.error("Error adding comment:", error);
      setDetailsError(error?.message || "The comment could not be added.");
    } finally {
      setDetailsSaving(false);
    }
  };

  const addFiles = async (event) => {
    const files = Array.from(event.target.files || []);
    const companyId = readSelectedCompanyId();
    event.target.value = "";
    if (!files.length || !selectedOrder || !companyId) return;
    const orderInternalId = orderIdOf(selectedOrder);
    setDetailsSaving(true);
    setDetailsError("");
    try {
      // 1) Upload each file to Firebase, 2) record the URLs on the backend.
      const uploaded = await orderDetailsUploadService.uploadMany({ companyId, orderInternalId, files });
      const view = await orderDetailsService.addAttachments({ companyId, orderInternalId, attachments: uploaded });
      if (view) setDetails(view);
    } catch (error) {
      console.error("Error uploading attachments:", error);
      setDetailsError(error?.message || "The files could not be uploaded.");
    } finally {
      setDetailsSaving(false);
    }
  };

  const removeAttachment = async (attachment) => {
    const companyId = readSelectedCompanyId();
    if (!selectedOrder || !companyId) return;
    setDetailsSaving(true);
    setDetailsError("");
    try {
      const view = await orderDetailsService.deleteAttachment({
        companyId, orderInternalId: orderIdOf(selectedOrder),
        attachmentId: attachment.orderAttachmentId,
      });
      if (view?.details) setDetails(view.details);
      // Best-effort: also remove the Firebase object.
      if (attachment.storagePath) {
        orderDetailsUploadService.deleteByPath(attachment.storagePath);
      }
    } catch (error) {
      console.error("Error deleting attachment:", error);
      setDetailsError(error?.message || "The file could not be deleted.");
    } finally {
      setDetailsSaving(false);
    }
  };

  const formatDate = (value) => {
    if (!value) return "—";
    const date = new Date(`${datePart(value)}T12:00:00`);
    return Number.isNaN(date.getTime()) ? "—" : new Intl.DateTimeFormat(locale, {
      year: "numeric", month: "short", day: "2-digit",
    }).format(date);
  };

  const formatDateTime = (value) => {
    if (!value) return "—";
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? "—" : new Intl.DateTimeFormat(locale, {
      dateStyle: "medium", timeStyle: "short",
    }).format(date);
  };

  return (
    <section className="operational-tracking">
      <header className="operational-tracking__header">
        <div>
          <p className="operational-tracking__eyebrow">{t("operationalTracking.eyebrow")}</p>
          <h1>{t("operationalTracking.title")}</h1>
          <p>{t("operationalTracking.description")}</p>
        </div>
        <span className="operational-tracking__count">
          {t("operationalTracking.orderCount", { count: visibleOrders.length })}
        </span>
      </header>

      <form className="tracking-filters" onSubmit={searchOrders}>
        <div className="tracking-filters__title">
          <div><FaMagnifyingGlass /><span>{t("operationalTracking.filters.title")}</span></div>
          <small>{t("operationalTracking.filters.help")}</small>
        </div>

        <div className="tracking-filters__grid">
          <label><span>{t("operationalTracking.filters.customer")}</span><select name="customer" value={filters.customer} onChange={updateFilter}><option value="">{t("operationalTracking.common.all")}</option>{customers.map((customer) => <option key={customer}>{customer}</option>)}</select></label>
          <label><span>{t("operationalTracking.filters.startDate")}</span><input name="startDate" type="date" value={filters.startDate} onChange={updateFilter} /></label>
          <label><span>{t("operationalTracking.filters.endDate")}</span><input name="endDate" type="date" value={filters.endDate} onChange={updateFilter} /></label>
          <label><span>{t("operationalTracking.filters.category")}</span><select name="category" value={filters.category} onChange={updateFilter}><option value="">{t("operationalTracking.common.all")}</option>{categories.map((category) => <option key={category}>{category}</option>)}</select></label>
          <label><span>{t("operationalTracking.filters.type")}</span><select name="type" value={filters.type} onChange={updateFilter}><option value="">{t("operationalTracking.common.all")}</option><option value="product">{t("operationalTracking.type.product")}</option><option value="service">{t("operationalTracking.type.service")}</option></select></label>
          <label><span>{t("operationalTracking.filters.orderName")}</span><input name="orderName" value={filters.orderName} onChange={updateFilter} placeholder={t("operationalTracking.filters.orderPlaceholder")} /></label>
          <label><span>{t("operationalTracking.filters.product")}</span><input name="product" value={filters.product} onChange={updateFilter} placeholder={t("operationalTracking.filters.productPlaceholder")} /></label>
          <label><span>{t("operationalTracking.filters.booking")}</span><select name="booking" value={filters.booking} onChange={updateFilter}><option value="">{t("operationalTracking.common.all")}</option><option value="yes">{t("operationalTracking.common.yes")}</option><option value="no">{t("operationalTracking.common.no")}</option></select></label>
          <label><span>{t("operationalTracking.filters.role")}</span><select name="role" value={filters.role} onChange={updateFilter}><option value="">{t("operationalTracking.common.all")}</option>{roles.map((role) => <option key={role}>{role}</option>)}</select></label>
          <label><span>{t("operationalTracking.filters.status")}</span><select name="status" value={filters.status} onChange={updateFilter}><option value="">{t("operationalTracking.common.all")}</option><option value="pending">{t("operationalTracking.status.pending", { defaultValue: "Pending (active)" })}</option>{STATUS_OPTIONS.map((status) => <option value={status.value} key={status.value}>{t(status.labelKey)}</option>)}</select></label>
        </div>

        <div className="tracking-filters__actions">
          <button className="tracking-button tracking-button--ghost" type="button" onClick={clearFilters}><FaArrowRotateLeft />{t("operationalTracking.actions.clear")}</button>
          <button className="tracking-button tracking-button--primary" type="submit"><FaMagnifyingGlass />{t("operationalTracking.actions.search")}</button>
        </div>
      </form>

      <div className="order-list-section">
        <div className="order-list-section__title">
          <div><h2>{t("operationalTracking.list.title")}</h2><p>{t("operationalTracking.list.oldestFirst")}</p></div>
          <p role="status">{loadingOrders ? "Loading orders..." : loadingError || message}</p>
        </div>

        <div className="order-table-wrap">
          <table className="order-table">
            <thead><tr>
              <th>{t("operationalTracking.columns.number")}</th>
              <th>{t("operationalTracking.columns.order")}</th>
              <th>{t("operationalTracking.columns.customer")}</th>
              <th>{t("operationalTracking.columns.product")}</th>
              <th>{t("operationalTracking.columns.type")}</th>
              <th>{t("operationalTracking.columns.date")}</th>
              <th>{t("operationalTracking.columns.status")}</th>
              <th>{t("operationalTracking.columns.actions")}</th>
            </tr></thead>
            <tbody>
              {visibleOrders.map((order) => (
                <tr key={order.id}>
                  <td><strong>{order.displayNumber}</strong></td>
                  <td><strong>{order.orderName}</strong><small>{order.responsible} · {order.role}</small></td>
                  <td>{order.customer}</td>
                  <td><span>{order.product}</span><small>{order.category}</small></td>
                  <td><span className={`order-type order-type--${order.type}`}>{t(`operationalTracking.type.${order.type}`)}</span>{order.hasBooking && <small>{t("operationalTracking.list.booking")}</small>}</td>
                  <td><span>{formatDate(order.orderDate)}</span><small>{t("operationalTracking.list.delivery")}: {formatDate(order.deliveryDate)}</small></td>
                  <td><span className={`order-status order-status--${order.status}`}>{t(`operationalTracking.status.${order.status}`, { defaultValue: ({ placed: "Placed", inProgress: "In progress", partialDone: "Partial done", done: "Done", cancelled: "Cancelled" })[order.status] || order.status })}</span></td>
                  <td>
                    <div className="order-actions">
                      <button type="button" className="tracking-button tracking-button--detail" onClick={() => openDetails(order)}><FaCircleInfo />{t("operationalTracking.actions.details")}</button>
                      <button type="button" className="tracking-button tracking-button--status" onClick={() => openItems(order)}><FaListCheck />{t("operationalTracking.actions.items", { defaultValue: "Items" })}</button>
                      <button type="button" className="tracking-button tracking-button--history" onClick={() => openHistory(order)}><FaClockRotateLeft />{t("operationalTracking.actions.history", { defaultValue: "History" })}</button>
                      <button type="button" className="tracking-button tracking-button--cancel" onClick={() => cancelOrder(order)} disabled={String(order.status).toLowerCase() === "cancelled"}><FaBan />{t("operationalTracking.actions.cancel", { defaultValue: "Cancel" })}</button>
                    </div>
                  </td>
                </tr>
              ))}
              {!loadingOrders && !loadingError && visibleOrders.length === 0 && <tr><td className="order-table__empty" colSpan="8">{t("operationalTracking.list.empty")}</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {selectedOrder && (
        <div className="tracking-modal" role="dialog" aria-modal="true" aria-labelledby="tracking-detail-title">
          <button className="tracking-modal__backdrop" type="button" onClick={closeDetails} aria-label={t("operationalTracking.actions.close")} />
          <aside className="tracking-detail">
            <header className="tracking-detail__header">
              <div><p>{selectedOrder.displayNumber}</p><h2 id="tracking-detail-title">{selectedOrder.orderName}</h2><span>{selectedOrder.customer}</span></div>
              <button type="button" onClick={closeDetails} aria-label={t("operationalTracking.actions.close")}><FaXmark /></button>
            </header>

            <div className="tracking-detail__body">
              <div className="tracking-detail__summary">
                <div><span>{t("operationalTracking.detail.responsible")}</span><strong>{selectedOrder.responsible}</strong></div>
                <div><span>{t("operationalTracking.detail.delivery")}</span><strong>{formatDate(selectedOrder.deliveryDate)}</strong></div>
                <div><span>{t("operationalTracking.detail.followUp")}</span><strong>{formatDate(selectedOrder.followUpDate)}</strong></div>
              </div>

              <div className="tracking-detail__status tracking-detail__status--readonly">
                <span>{t("operationalTracking.detail.status")}</span>
                <span className={`order-status order-status--${selectedOrder.status}`}>
                  {({ placed: "Placed", inProgress: "In progress", partialDone: "Partial done", done: "Done", cancelled: "Cancelled" })[selectedOrder.status] || selectedOrder.status}
                </span>
              </div>

              <button type="button" className="tracking-button tracking-button--ghost tracking-detail__contact-btn" onClick={() => setContactOpen(true)}>
                <FaAddressCard />{t("operationalTracking.detail.contactInfo", { defaultValue: "Contact information" })}
              </button>

              <section className="tracking-detail__section">
                <h3>{t("operationalTracking.detail.attachments")}</h3>
                <input ref={fileInputRef} type="file" multiple onChange={addFiles} style={{ display: "none" }} />
                <button className="attachment-drop" type="button" onClick={() => fileInputRef.current?.click()} disabled={detailsSaving}><FaPaperclip /><span>{detailsSaving ? t("operationalTracking.actions.uploading", { defaultValue: "Uploading..." }) : t("operationalTracking.actions.addFiles")}</span></button>
                <div className="detail-files">{details.attachments.map((attachment) => <div key={attachment.orderAttachmentId}><a href={attachment.url} target="_blank" rel="noreferrer"><strong>{attachment.fileName || "file"}</strong><small>{Math.round((attachment.fileSize || 0) / 1024)} KB</small></a><button type="button" onClick={() => removeAttachment(attachment)} aria-label={t("operationalTracking.actions.removeFile")}><FaTrash /></button></div>)}</div>
              </section>

              <section className="tracking-detail__section">
                <h3>{t("operationalTracking.detail.comments")}</h3>
                {detailsError && <p className="items-list__error">{detailsError}</p>}
                <div className="comment-list">
                  {detailsLoading && <p>{t("operationalTracking.detail.loading", { defaultValue: "Loading..." })}</p>}
                  {!detailsLoading && details.comments.length === 0 && <p>{t("operationalTracking.detail.noComments")}</p>}
                  {details.comments.map((comment) => <article key={comment.orderCommentId}><div><strong>{comment.authorEmail || t("operationalTracking.detail.user", { defaultValue: "User" })}</strong><small>{formatDateTime(comment.createdAt)}</small></div><p>{comment.commentText}</p></article>)}
                </div>
                <textarea rows="3" value={newComment} onChange={(event) => setNewComment(event.target.value)} placeholder={t("operationalTracking.detail.commentPlaceholder")} />
                <button className="tracking-button tracking-button--ghost" type="button" onClick={addComment} disabled={detailsSaving || !newComment.trim()}><FaPlus />{t("operationalTracking.actions.addComment")}</button>
              </section>

              <section className="tracking-detail__section">
                <h3>{t("operationalTracking.detail.timeline", { defaultValue: "Tracking timeline" })}</h3>
                {timelineLoading ? (
                  <p>{t("operationalTracking.detail.timelineLoading", { defaultValue: "Loading timeline..." })}</p>
                ) : timeline.length === 0 ? (
                  <p>{t("operationalTracking.detail.timelineEmpty", { defaultValue: "No movements yet." })}</p>
                ) : (
                  <ol className="history-timeline">
                    {timeline.map((entry) => (
                      <li className="history-timeline__item" key={entry.historyId}>
                        <span className={`history-dot order-status--${({ PLACED: "placed", IN_PROGRESS: "inProgress", PARTIAL_DONE: "partialDone", DONE: "done", CANCELLED: "cancelled" })[entry.orderStatus] || "placed"}`} />
                        <div className="history-timeline__content">
                          <strong>{entry.productName || "Item"} · {entry.stepName || t("operationalTracking.items.notStarted", { defaultValue: "— Not started —" })}</strong>
                          <small>{formatDateTime(entry.changedAt)}{entry.changedByEmail ? ` · ${entry.changedByEmail}` : ""}</small>
                        </div>
                      </li>
                    ))}
                  </ol>
                )}
              </section>

            </div>

            <footer className="tracking-detail__footer">
              <button className="tracking-button tracking-button--primary" type="button" onClick={closeDetails}>{t("operationalTracking.actions.close")}</button>
            </footer>
          </aside>
        </div>
      )}

      {contactOpen && selectedOrder && (() => {
        const c = details.contact || {};
        const empty = t("operationalTracking.contact.empty", { defaultValue: "Not provided" });
        const mapUrl = contactMapUrl(c);
        return (
          <div className="tracking-modal tracking-modal--center" role="dialog" aria-modal="true">
            <button className="tracking-modal__backdrop" type="button" onClick={() => setContactOpen(false)} aria-label={t("operationalTracking.actions.close")} />
            <aside className="contact-card">
              <header className="contact-card__header">
                <h2><FaAddressCard />{t("operationalTracking.contact.title", { defaultValue: "Contact information" })}</h2>
                <button type="button" onClick={() => setContactOpen(false)} aria-label={t("operationalTracking.actions.close")}><FaXmark /></button>
              </header>

              <div className="contact-card__body">
                <div className="contact-row">
                  <span>{t("operationalTracking.contact.name", { defaultValue: "Name" })}</span>
                  <strong>{c.name || selectedOrder.customer || empty}</strong>
                </div>
                <div className="contact-row">
                  <span>{t("operationalTracking.contact.phone", { defaultValue: "Phone" })}</span>
                  {c.cellphone ? <a href={`tel:${c.cellphone}`}>{c.cellphone}</a> : <strong className="is-empty">{empty}</strong>}
                </div>
                <div className="contact-row">
                  <span>{t("operationalTracking.contact.email", { defaultValue: "Email" })}</span>
                  {c.email ? <a href={`mailto:${c.email}`}>{c.email}</a> : <strong className="is-empty">{empty}</strong>}
                </div>
                <div className="contact-row">
                  <span>{t("operationalTracking.contact.preferred", { defaultValue: "Preferred contact" })}</span>
                  <strong className={c.preferredContactMethod || c.contactValue ? "" : "is-empty"}>
                    {[c.preferredContactMethod, c.contactValue].filter(Boolean).join(" · ") || empty}
                  </strong>
                </div>
                <div className="contact-row">
                  <span>{t("operationalTracking.contact.social", { defaultValue: "Social network" })}</span>
                  {c.socialNetworkLink ? (
                    <a href={c.socialNetworkLink} target="_blank" rel="noreferrer">{c.socialNetwork || c.socialNetworkLink}</a>
                  ) : (
                    <strong className={c.socialNetwork ? "" : "is-empty"}>{c.socialNetwork || empty}</strong>
                  )}
                </div>
                <div className="contact-row">
                  <span>{t("operationalTracking.contact.address", { defaultValue: "Address / location" })}</span>
                  <strong className={c.address ? "" : "is-empty"}>{c.address || empty}</strong>
                </div>

                {mapUrl && (
                  <a className="tracking-button tracking-button--primary contact-card__map" href={mapUrl} target="_blank" rel="noreferrer">
                    <FaLocationDot />{t("operationalTracking.contact.openMap", { defaultValue: "Open location" })}
                  </a>
                )}
              </div>

              <footer className="contact-card__footer">
                <button className="tracking-button tracking-button--ghost" type="button" onClick={() => setContactOpen(false)}>{t("operationalTracking.actions.close")}</button>
              </footer>
            </aside>
          </div>
        );
      })()}

      {itemsOrder && (
        <div className="tracking-modal" role="dialog" aria-modal="true">
          <button className="tracking-modal__backdrop" type="button" onClick={closeItems} aria-label={t("operationalTracking.actions.close")} />
          <aside className="tracking-detail tracking-detail--items">
            <header className="tracking-detail__header">
              <div>
                <p>{itemsOrder.displayNumber}</p>
                <h2>{t("operationalTracking.items.title", { defaultValue: "Order items" })}</h2>
                <span>{itemsOrder.customer}</span>
              </div>
              <button type="button" onClick={closeItems} aria-label={t("operationalTracking.actions.close")}><FaXmark /></button>
            </header>

            <div className="tracking-detail__body">
              {itemsError && <p className="items-list__error">{itemsError}</p>}
              {itemsLoading ? (
                <p>{t("operationalTracking.items.loading", { defaultValue: "Loading items..." })}</p>
              ) : !itemsTracking || (itemsTracking.items || []).length === 0 ? (
                <p>{t("operationalTracking.items.empty", { defaultValue: "This order has no items." })}</p>
              ) : (
                <div className="items-list">
                  {(itemsTracking.items || []).map((item) => {
                    const cancelled = String(itemsTracking.orderStatus).toUpperCase() === "CANCELLED";
                    const saving = itemSavingId === item.orderItemId;
                    const hasProcess = (item.stepOptions || []).length > 0;
                    return (
                      <div className="items-list__row" key={item.orderItemId}>
                        <div className="items-list__info">
                          <strong>{item.productName || "Item"}</strong>
                          <small>{item.internalCode || ""} · {t("operationalTracking.items.qty", { defaultValue: "Qty" })} {item.quantity}</small>
                        </div>
                        <label className="items-list__stage">
                          <span>{t("operationalTracking.items.stage", { defaultValue: "Stage" })}{saving ? " …" : ""}</span>
                          {hasProcess ? (
                            <select
                              value={item.currentStepId || ""}
                              onChange={(event) => saveItemStep(item, event.target.value)}
                              disabled={cancelled || saving}
                            >
                              <option value="">{t("operationalTracking.items.notStarted", { defaultValue: "— Not started —" })}</option>
                              {(item.stepOptions || []).map((opt) => (
                                <option key={opt.stepTemplateStepId} value={opt.stepTemplateStepId}>
                                  {opt.name}{opt.isDoneStep ? " ✓" : ""}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <em className="items-list__noprocess">
                              {t("operationalTracking.items.noProcess", { defaultValue: "No process assigned" })}
                            </em>
                          )}
                        </label>
                      </div>
                    );
                  })}
                </div>
              )}
              <p className="items-list__note">
                {t("operationalTracking.items.note", { defaultValue: "The order status is computed automatically from the items." })}
              </p>
            </div>

            <footer className="tracking-detail__footer">
              {itemsTracking?.orderStatus && (
                <span className={`order-status order-status--${({ PLACED: "placed", IN_PROGRESS: "inProgress", PARTIAL_DONE: "partialDone", DONE: "done", CANCELLED: "cancelled" })[itemsTracking.orderStatus] || "placed"}`}>
                  {({ PLACED: "Placed", IN_PROGRESS: "In progress", PARTIAL_DONE: "Partial done", DONE: "Done", CANCELLED: "Cancelled" })[itemsTracking.orderStatus] || itemsTracking.orderStatus}
                </span>
              )}
              <button className="tracking-button tracking-button--primary" type="button" onClick={closeItems}>{t("operationalTracking.actions.close")}</button>
            </footer>
          </aside>
        </div>
      )}

      {historyOrder && (
        <div className="tracking-modal" role="dialog" aria-modal="true">
          <button className="tracking-modal__backdrop" type="button" onClick={closeHistory} aria-label={t("operationalTracking.actions.close")} />
          <aside className="tracking-detail tracking-detail--items">
            <header className="tracking-detail__header">
              <div>
                <p>{historyOrder.displayNumber}</p>
                <h2>{t("operationalTracking.history.title", { defaultValue: "Tracking history" })}</h2>
                <span>{historyOrder.customer}</span>
              </div>
              <button type="button" onClick={closeHistory} aria-label={t("operationalTracking.actions.close")}><FaXmark /></button>
            </header>

            <div className="tracking-detail__body">
              {timelineLoading ? (
                <p>{t("operationalTracking.history.loading", { defaultValue: "Loading history..." })}</p>
              ) : timeline.length === 0 ? (
                <p>{t("operationalTracking.history.empty", { defaultValue: "No history yet." })}</p>
              ) : (
                <ol className="history-timeline">
                  {timeline.map((entry) => (
                    <li className="history-timeline__item" key={entry.historyId}>
                      <span className={`history-dot order-status--${({ PLACED: "placed", IN_PROGRESS: "inProgress", PARTIAL_DONE: "partialDone", DONE: "done", CANCELLED: "cancelled" })[entry.orderStatus] || "placed"}`} />
                      <div className="history-timeline__content">
                        <strong>{entry.productName || "Item"} · {entry.stepName || t("operationalTracking.items.notStarted", { defaultValue: "— Not started —" })}</strong>
                        <small>{formatDateTime(entry.changedAt)}{entry.changedByEmail ? ` · ${entry.changedByEmail}` : ""}</small>
                      </div>
                    </li>
                  ))}
                </ol>
              )}
              <p className="items-list__note">
                {t("operationalTracking.history.note", { defaultValue: "Stage changes recorded for this order." })}
              </p>
            </div>

            <footer className="tracking-detail__footer">
              <button className="tracking-button tracking-button--primary" type="button" onClick={closeHistory}>{t("operationalTracking.actions.close")}</button>
            </footer>
          </aside>
        </div>
      )}
    </section>
  );
}