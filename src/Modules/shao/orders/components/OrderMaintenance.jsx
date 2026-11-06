import { useEffect, useMemo, useRef, useState } from "react";
import {
  FaCalendarCheck,
  FaFile,
  FaFloppyDisk,
  FaImage,
  FaMagnifyingGlass,
  FaPaperclip,
  FaPlus,
  FaTrash,
  FaUserPlus,
} from "react-icons/fa6";
import { Modal } from "react-bootstrap";
import "./OrderMaintenance.scss";

import SaveOrderService from "../services/SaveOrderService";
import OrderAttachmentUploadService from "../services/OrderAttachmentUploadService";
import SearchCustomersService from "../../customers/services/SearchCustomersService";
import SearchProductsService from "../../products/services/SearchProductsService";
import CustomerCreateForm from "../../customers/components/CustomerCreateForm";

const SELECTED_COMPANY_STORAGE_KEY = "selectedCompany";

const saveOrderService = new SaveOrderService();
const orderAttachmentUploadService = new OrderAttachmentUploadService();
const searchCustomersService = new SearchCustomersService();
const searchProductsService = new SearchProductsService();

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

const INITIAL_ORDER = {
  orderInternalId: "",
  customer: null,
  // Email for customer notifications (optional; prefilled from the customer).
  customerEmail: "",
  channel: "whatsapp",
  startDate: "",
  estimatedDeliveryDate: "",
  items: [],
  notes: "",
  attachments: [],
  // Tax mode for the whole order: "amount" (default) or "percentage".
  taxMode: "amount",
  // Tracking is per product now (2026-10-30): the general tracking option is
  // hidden and always OFF; each product follows its own product/category steps.
  useGeneralTracking: false,
  generalTrackingId: "",
  // Orders start PLACED (PLACED -> IN_PROGRESS -> PARTIAL_DONE -> DONE / CANCELLED).
  status: "PLACED",
};

// Backend customer row -> the small shape this screen uses.
function toOrderCustomer(row) {
  return {
    id: String(row?.customerInternalId || row?.customer_internal_id || ""),
    name: String(row?.name || ""),
    phone: String(row?.cellphone || row?.phone || ""),
    email: String(row?.email || ""),
  };
}

export default function OrderMaintenance({ t }) {
  const [order, setOrder] = useState(INITIAL_ORDER);
  const [customerSearch, setCustomerSearch] = useState("");
  const [productSearch, setProductSearch] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const fileInputRef = useRef(null);

  // Real-data results (filled from the backend).
  const [customerResults, setCustomerResults] = useState([]);
  const [productResults, setProductResults] = useState([]);
  // Customer autocomplete state (2026-10-30): open/closed list, "searching",
  // "no results" and backend error, so the user always sees what happens.
  const [customerListOpen, setCustomerListOpen] = useState(false);
  const [customerSearching, setCustomerSearching] = useState(false);
  const [customerSearchError, setCustomerSearchError] = useState("");
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const customerBoxRef = useRef(null);

  // Live customer search: query the backend as the user types (debounced).
  useEffect(() => {
    const term = customerSearch.trim();
    setCustomerSearchError("");
    if (!term || order.customer) {
      setCustomerResults([]);
      setCustomerSearching(false);
      return undefined;
    }
    const companyId = readSelectedCompanyId();
    if (!companyId) {
      setCustomerResults([]);
      setCustomerSearchError(
        t("orderMaintenance.messages.missingCompany", {
          defaultValue: "No company is selected. Please select a company first.",
        }),
      );
      return undefined;
    }

    let active = true;
    setCustomerSearching(true);
    const timer = setTimeout(() => {
      searchCustomersService
        .getCustomers({ companyId, filters: { term, limit: 8 } })
        .then((rows) => {
          if (!active) return;
          setCustomerResults(
            (Array.isArray(rows) ? rows : []).map(toOrderCustomer).filter((row) => row.id).slice(0, 8),
          );
        })
        .catch((error) => {
          if (!active) return;
          setCustomerResults([]);
          setCustomerSearchError(
            error?.message ||
              t("orderMaintenance.customer.searchError", {
                defaultValue: "The customers could not be searched. Please try again.",
              }),
          );
        })
        .finally(() => {
          if (active) setCustomerSearching(false);
        });
    }, 300);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [customerSearch, order.customer, t]);

  // Close the customer list when clicking outside of it.
  useEffect(() => {
    if (!customerListOpen) return undefined;
    const handleOutside = (event) => {
      if (customerBoxRef.current && !customerBoxRef.current.contains(event.target)) {
        setCustomerListOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [customerListOpen]);

  // Live product search: query the backend as the user types (debounced).
  useEffect(() => {
    const term = productSearch.trim();
    if (!term) {
      setProductResults([]);
      return undefined;
    }
    const companyId = readSelectedCompanyId();
    if (!companyId) return undefined;

    let active = true;
    const timer = setTimeout(() => {
      searchProductsService
        .getProducts({ companyId, filters: { term } })
        .then((rows) => {
          if (!active) return;
          const selectedIds = new Set(order.items.map((item) => item.productId));
          setProductResults(
            (Array.isArray(rows) ? rows : [])
              .map((row) => ({
                id: String(row.productInternalId || row.product_internal_id || ""),
                name: String(row.name || ""),
                internalCode: String(row.productCode || row.product_code || ""),
                price: Number(row.basePrice ?? row.base_price ?? 0) || 0,
                // Appointments are booked, never ordered (2026-10-31).
                isAppointment:
                  String(row.webBehavior || row.web_behavior || "").toUpperCase() === "BOOKING",
              }))
              .filter((row) => row.id && !row.isAppointment && !selectedIds.has(row.id))
              .slice(0, 6),
          );
        })
        .catch(() => {
          if (active) setProductResults([]);
        });
    }, 300);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [productSearch, order.items]);

  // Per-line computed values. Taxes depend on the order tax mode:
  //   "percentage" -> tax = base * (taxPercentage / 100)
  //   "amount"     -> tax = the typed taxAmount
  // (additionalPrice is kept in state/DB but no longer shown in the UI.)
  const computeLine = (item) => {
    const base = (Number(item.quantity) || 0) *
      ((Number(item.unitPrice) || 0) + (Number(item.additionalPrice) || 0));

    // Discount (percentage) is applied first, before taxes.
    const discountAmount = base * ((Number(item.discountPercentage) || 0) / 100);
    const taxedBase = base - discountAmount;

    const taxAmount =
      order.taxMode === "percentage"
        ? taxedBase * ((Number(item.taxPercentage) || 0) / 100)
        : Number(item.taxAmount) || 0;

    return { base, discountAmount, taxedBase, taxAmount, subtotal: taxedBase + taxAmount };
  };

  const total = useMemo(
    () => order.items.reduce((sum, item) => sum + computeLine(item).subtotal, 0),
    [order.items],
  );

  const selectCustomer = (customer) => {
    setOrder((current) => ({ ...current, customer, customerEmail: customer.email || "" }));
    setCustomerSearch(customer.name);
    setCustomerListOpen(false);
    setCustomerResults([]);
    setMessage("");
  };

  // "New customer" pop-up: the saved customer is selected for this order.
  const openCustomerModal = () => {
    setCustomerListOpen(false);
    setShowCustomerModal(true);
  };

  const handleCustomerCreated = (savedCustomer) => {
    const customer = toOrderCustomer(savedCustomer);
    setShowCustomerModal(false);
    if (customer.id) selectCustomer(customer);
  };

  const clearCustomer = () => {
    setOrder((current) => ({ ...current, customer: null, customerEmail: "" }));
    setCustomerSearch("");
  };

  const addProduct = (product) => {
    setOrder((current) => ({
      ...current,
      items: [
        ...current.items,
        {
          productId: product.id,
          name: product.name,
          internalCode: product.internalCode,
          quantity: 1,
          unitPrice: product.price,
          additionalPrice: 0,
          discountPercentage: 0,
          taxPercentage: 0,
          taxAmount: 0,
        },
      ],
    }));
    setProductSearch("");
    setMessage("");
  };

  const updateItem = (index, field, value) => {
    const numericValue = Math.max(0, Number(value) || 0);
    setOrder((current) => ({
      ...current,
      items: current.items.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [field]: numericValue } : item,
      ),
    }));
  };

  const removeItem = (index) => {
    setOrder((current) => ({
      ...current,
      items: current.items.filter((_, itemIndex) => itemIndex !== index),
    }));
  };

  const addAttachments = (event) => {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;

    const mappedFiles = files.map((file) => ({
      id: `${file.name}-${file.lastModified}-${file.size}`,
      file,
      name: file.name,
      size: file.size,
      type: file.type,
      previewUrl: file.type.startsWith("image/") ? URL.createObjectURL(file) : null,
    }));

    setOrder((current) => ({
      ...current,
      attachments: [...current.attachments, ...mappedFiles],
    }));
    event.target.value = "";
  };

  const removeAttachment = (id) => {
    setOrder((current) => {
      const attachment = current.attachments.find((item) => item.id === id);
      if (attachment?.previewUrl) URL.revokeObjectURL(attachment.previewUrl);
      return {
        ...current,
        attachments: current.attachments.filter((item) => item.id !== id),
      };
    });
  };

  const saveOrder = async (event) => {
    event.preventDefault();

    if (!order.customer) {
      setMessage(t("orderMaintenance.messages.customerRequired"));
      return;
    }
    if (!order.items.length) {
      setMessage(t("orderMaintenance.messages.productRequired"));
      return;
    }
    if (!order.startDate || !order.estimatedDeliveryDate) {
      setMessage(t("orderMaintenance.messages.datesRequired"));
      return;
    }
    if (order.estimatedDeliveryDate < order.startDate) {
      setMessage(t("orderMaintenance.messages.invalidDeliveryDate"));
      return;
    }
    const companyId = readSelectedCompanyId();
    if (!companyId) {
      setMessage(
        t("orderMaintenance.messages.missingCompany", {
          defaultValue: "No company is selected. Please select a company first.",
        }),
      );
      return;
    }

    // Build the backend bundle { order, items } with the backend field names.
    const bundle = {
      order: {
        orderInternalId: order.orderInternalId || "",
        customerId: order.customer.id,
        customerName: order.customer.name || "",
        customerEmail: (order.customerEmail || "").trim(),
        channel: order.channel,
        startDate: order.startDate || "",
        estimatedDeliveryDate: order.estimatedDeliveryDate || "",
        notes: order.notes || "",
        // Tracking is per product: no general tracking is sent.
        useGeneralTracking: false,
        generalTrackingId: "",
        status: order.status || "PLACED",
      },
      items: order.items.map((item, index) => {
        const line = computeLine(item);
        return {
          productId: item.productId,
          internalCode: item.internalCode || "",
          quantity: Number(item.quantity) || 1,
          unitPrice: Number(item.unitPrice) || 0,
          additionalPrice: Number(item.additionalPrice) || 0,
          discountPercentage: Number(item.discountPercentage) || 0,
          taxPercentage:
            order.taxMode === "percentage"
              ? Number(item.taxPercentage) || 0
              : null,
          taxAmount: line.taxAmount,
          itemOrder: index + 1,
        };
      }),
    };

    setSaving(true);
    setMessage("");

    try {
      // Upload attachments (images/documents) to Firebase Storage first, then
      // send only their URLs/paths to the backend. Files already uploaded
      // (they carry a url and no File) are passed through unchanged.
      let uploadedAttachments = [];
      if (order.attachments.length > 0) {
        setUploadingFiles(true);
        try {
          uploadedAttachments =
            await orderAttachmentUploadService.uploadManyOrderAttachments({
              companyId,
              orderInternalId: order.orderInternalId || "",
              attachments: order.attachments,
            });
        } finally {
          setUploadingFiles(false);
        }
      }

      // Attach the uploaded references to the bundle.
      bundle.attachments = uploadedAttachments.map((file) => ({
        url: file.url,
        storagePath: file.path,
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size || 0,
      }));

      const response = await saveOrderService.saveOrder({
        companyId,
        order: bundle,
      });

      // Adopt the id returned by the backend so a second save updates.
      const savedId =
        response?.result?.order?.orderInternalId ||
        response?.result?.order?.order_internal_id ||
        "";
      if (savedId) {
        setOrder((current) => ({ ...current, orderInternalId: savedId }));
      }

      setMessage(t("orderMaintenance.messages.saved"));
    } catch (error) {
      console.error("Error saving order:", error);
      setMessage(
        error?.message ||
          t("orderMaintenance.messages.saveError", {
            defaultValue: "The order could not be saved. Please try again.",
          }),
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="order-maintenance">
      <header className="order-maintenance__header">
        <div>
          <p className="order-maintenance__eyebrow">{t("orderMaintenance.eyebrow")}</p>
          <h1>{t("orderMaintenance.title")}</h1>
          <p>{t("orderMaintenance.description")}</p>
        </div>
        <span className="order-maintenance__status">
          <FaCalendarCheck aria-hidden="true" /> {t("orderMaintenance.status.placed", { defaultValue: "New order (placed)" })}
        </span>
      </header>

      <form onSubmit={saveOrder}>
        <div className="order-panel">
          <div className="order-panel__title">
            <span>1</span>
            <div>
              <h2>{t("orderMaintenance.customer.title")}</h2>
              <p>{t("orderMaintenance.customer.description")}</p>
            </div>
          </div>

          <div className="order-customer-grid">
            <div>
              <label className="order-control-label" htmlFor="customer-search">{t("orderMaintenance.customer.searchLabel")}</label>
              <div className="order-maintenance__customer-row">
                <div className="order-autocomplete" ref={customerBoxRef}>
                  <FaMagnifyingGlass aria-hidden="true" />
                  <input
                    id="customer-search"
                    value={customerSearch}
                    autoComplete="off"
                    onChange={(event) => {
                      setCustomerSearch(event.target.value);
                      setCustomerListOpen(true);
                      if (order.customer) setOrder((current) => ({ ...current, customer: null, customerEmail: "" }));
                    }}
                    onFocus={() => setCustomerListOpen(true)}
                    onKeyDown={(event) => {
                      if (event.key === "Escape") setCustomerListOpen(false);
                      if (event.key === "Enter") {
                        // Enter picks the first result instead of submitting the order.
                        event.preventDefault();
                        if (customerResults.length > 0) selectCustomer(customerResults[0]);
                      }
                    }}
                    placeholder={t("orderMaintenance.customer.searchPlaceholder")}
                  />
                  {customerListOpen && !order.customer && customerSearch.trim() && (
                    <div className="order-autocomplete__results">
                      {customerResults.map((customer) => (
                        <button key={customer.id} type="button" onClick={() => selectCustomer(customer)}>
                          <span>{customer.name}</span>
                          <small>{[customer.phone, customer.email].filter(Boolean).join(" · ")}</small>
                        </button>
                      ))}
                      {customerSearching && customerResults.length === 0 && (
                        <p className="order-autocomplete__status">
                          {t("orderMaintenance.customer.searching", { defaultValue: "Searching..." })}
                        </p>
                      )}
                      {customerSearchError && (
                        <p className="order-autocomplete__status order-autocomplete__status--error">{customerSearchError}</p>
                      )}
                      {!customerSearching && !customerSearchError && customerResults.length === 0 && (
                        <p className="order-autocomplete__status">
                          {t("orderMaintenance.customer.noResults", { defaultValue: "No customers found." })}
                        </p>
                      )}
                      <button className="order-autocomplete__create" type="button" onClick={openCustomerModal}>
                        <span><FaUserPlus aria-hidden="true" /> {t("orderMaintenance.customer.createNew", { defaultValue: "Create a new customer" })}</span>
                      </button>
                    </div>
                  )}
                </div>

                <button
                  className="order-icon-button order-icon-button--primary"
                  type="button"
                  onClick={openCustomerModal}
                  aria-label={t("orderMaintenance.actions.createCustomer")}
                  title={t("orderMaintenance.actions.createCustomer")}
                >
                  <FaUserPlus aria-hidden="true" />
                </button>
              </div>
            </div>

            <div className="order-field order-field--channel">
              <label htmlFor="order-channel">{t("orderMaintenance.fields.channel.label")}</label>
              <select
                id="order-channel"
                value={order.channel}
                onChange={(event) => setOrder((current) => ({ ...current, channel: event.target.value }))}
              >
                <option value="whatsapp">WhatsApp</option>
                <option value="facebook">Facebook</option>
                <option value="phone">{t("orderMaintenance.channels.phone")}</option>
                <option value="other">{t("orderMaintenance.channels.other")}</option>
              </select>
            </div>

            <div className="order-field order-field--channel">
              <label htmlFor="order-tax-mode">
                {t("orderMaintenance.fields.taxMode.label", { defaultValue: "Tax mode" })}
              </label>
              <select
                id="order-tax-mode"
                value={order.taxMode}
                onChange={(event) =>
                  setOrder((current) => ({ ...current, taxMode: event.target.value }))
                }
              >
                <option value="amount">
                  {t("orderMaintenance.fields.taxMode.amount", { defaultValue: "Amount (₡)" })}
                </option>
                <option value="percentage">
                  {t("orderMaintenance.fields.taxMode.percentage", { defaultValue: "Percentage (%)" })}
                </option>
              </select>
              <small>
                {t("orderMaintenance.fields.taxMode.help", {
                  defaultValue: "Choose how taxes are entered for every product in this order.",
                })}
              </small>
            </div>

            {order.customer && (
              <div className="selected-customer">
                <span className="selected-customer__avatar">{order.customer.name.split(" ").map((part) => part[0]).join("").slice(0, 2)}</span>
                <div><strong>{order.customer.name}</strong><small>{order.customer.phone} · {order.customer.email}</small></div>
                <button type="button" onClick={clearCustomer}>{t("orderMaintenance.actions.change")}</button>
              </div>
            )}

            {order.customer && (
              <div className="order-field order-field--notify-email">
                <label htmlFor="order-customer-email">{t("orderMaintenance.fields.customerEmail.label")}</label>
                <input
                  id="order-customer-email"
                  type="email"
                  value={order.customerEmail}
                  onChange={(event) => setOrder((current) => ({ ...current, customerEmail: event.target.value }))}
                  placeholder="name@example.com"
                  maxLength={254}
                />
                {order.customerEmail.trim() ? (
                  <small>{t("orderMaintenance.fields.customerEmail.help")}</small>
                ) : (
                  <div className="order-notify-warning" role="status">
                    {t("orderMaintenance.fields.customerEmail.missing")}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="order-panel">
          <div className="order-panel__title">
            <span>2</span>
            <div><h2>{t("orderMaintenance.products.title")}</h2><p>{t("orderMaintenance.products.description")}</p></div>
          </div>

          <div className="order-autocomplete order-autocomplete--product">
            <FaMagnifyingGlass aria-hidden="true" />
            <input
              value={productSearch}
              onChange={(event) => setProductSearch(event.target.value)}
              placeholder={t("orderMaintenance.products.searchPlaceholder")}
              aria-label={t("orderMaintenance.products.searchLabel")}
            />
            {productResults.length > 0 && (
              <div className="order-autocomplete__results">
                {productResults.map((product) => (
                  <button key={product.id} type="button" onClick={() => addProduct(product)}>
                    <span>{product.name}</span>
                    <small>{product.internalCode}</small>
                    <FaPlus aria-hidden="true" />
                  </button>
                ))}
              </div>
            )}
          </div>
          <small className="order-products-note" style={{ display: "block", margin: "-6px 0 12px", color: "#6b7686" }}>
            {t("orderMaintenance.products.noAppointments", {
              defaultValue: "Appointments are not listed here: they are booked in Appointments.",
            })}
          </small>

          <div className="order-items">
            {order.items.length === 0 ? (
              <div className="order-items__empty">{t("orderMaintenance.products.empty")}</div>
            ) : <>
              <div className="order-item order-item--header">
                <span>{t("orderMaintenance.products.columns.product")}</span>
                <span>{t("orderMaintenance.products.columns.code")}</span>
                <span>{t("orderMaintenance.fields.quantity")}</span>
                <span>{t("orderMaintenance.fields.unitPrice")}</span>
                <span>{t("orderMaintenance.fields.discountPercentage", { defaultValue: "Disc %" })}</span>
                <span>
                  {order.taxMode === "percentage"
                    ? t("orderMaintenance.fields.taxPercentage", { defaultValue: "Tax %" })
                    : t("orderMaintenance.fields.taxAmount", { defaultValue: "Taxes (₡)" })}
                </span>
                <span>{t("orderMaintenance.products.columns.subtotal")}</span>
                <span />
              </div>
              {order.items.map((item, index) => (
              <div className="order-item" key={item.productId}>
                <div className="order-item__product">
                  <span className="order-item__thumbnail"><FaImage /></span>
                  <strong>{item.name || (item.nameKey ? t(item.nameKey) : "")}</strong>
                </div>
                <span className="order-item__code">{item.internalCode}</span>
                <label><span>{t("orderMaintenance.fields.quantity")}</span><input type="number" min="1" value={item.quantity} onChange={(event) => updateItem(index, "quantity", event.target.value)} /></label>
                <label><span>{t("orderMaintenance.fields.unitPrice")}</span><input type="number" min="0" value={item.unitPrice} onChange={(event) => updateItem(index, "unitPrice", event.target.value)} /></label>
                <label><span>{t("orderMaintenance.fields.discountPercentage", { defaultValue: "Disc %" })}</span><input type="number" min="0" max="100" step="0.01" value={item.discountPercentage ?? 0} onChange={(event) => updateItem(index, "discountPercentage", event.target.value)} /></label>
                {order.taxMode === "percentage" ? (
                  <label>
                    <span>{t("orderMaintenance.fields.taxPercentage", { defaultValue: "Tax %" })}</span>
                    <input type="number" min="0" max="100" step="0.01" value={item.taxPercentage ?? 0} onChange={(event) => updateItem(index, "taxPercentage", event.target.value)} />
                  </label>
                ) : (
                  <label>
                    <span>{t("orderMaintenance.fields.taxAmount", { defaultValue: "Taxes (₡)" })}</span>
                    <input type="number" min="0" step="0.01" value={item.taxAmount ?? 0} onChange={(event) => updateItem(index, "taxAmount", event.target.value)} />
                  </label>
                )}
                <strong className="order-item__subtotal">₡{computeLine(item).subtotal.toLocaleString()}</strong>
                <button className="order-icon-button order-icon-button--delete" type="button" onClick={() => removeItem(index)} aria-label={t("orderMaintenance.actions.removeProduct")}><FaTrash /></button>
              </div>
              ))}
            </>}
          </div>

          <div className="order-total"><span>{t("orderMaintenance.products.total")}</span><strong>₡{total.toLocaleString()}</strong></div>
        </div>

        {/* The order "Tracking" panel (general tracking) was removed on
            2026-10-30: tracking is per product now. */}

        <div className="order-panel">
          <div className="order-panel__title">
            <span>3</span>
            <div><h2>{t("orderMaintenance.details.title")}</h2><p>{t("orderMaintenance.details.description")}</p></div>
          </div>

          <div className="order-date-grid">
            <div className="order-field"><label htmlFor="start-date">{t("orderMaintenance.fields.startDate")}</label><input id="start-date" type="date" value={order.startDate} onChange={(event) => setOrder((current) => ({ ...current, startDate: event.target.value }))} /></div>
            <div className="order-field"><label htmlFor="delivery-date">{t("orderMaintenance.fields.deliveryDate")}</label><input id="delivery-date" type="date" min={order.startDate} value={order.estimatedDeliveryDate} onChange={(event) => setOrder((current) => ({ ...current, estimatedDeliveryDate: event.target.value }))} /></div>
          </div>

          <div className="order-field">
            <label htmlFor="order-notes">{t("orderMaintenance.fields.notes.label")}</label>
            <textarea id="order-notes" value={order.notes} onChange={(event) => setOrder((current) => ({ ...current, notes: event.target.value }))} placeholder={t("orderMaintenance.fields.notes.placeholder")} rows="5" />
            <small>{t("orderMaintenance.fields.notes.help")}</small>
          </div>

          <div className="order-attachments">
            <input ref={fileInputRef} type="file" multiple accept="image/*,.pdf,.doc,.docx,.xls,.xlsx" onChange={addAttachments} />
            <label className="order-control-label">{t("orderMaintenance.attachments.label")}</label>
            <div className="attachment-list">
              {order.attachments.length > 0 && (
                <>
                {order.attachments.map((attachment) => (
                  <div className="attachment-card" key={attachment.id}>
                    {attachment.previewUrl ? <img src={attachment.previewUrl} alt="" /> : <span className={attachment.mockKind === "pdf" ? "attachment-card__pdf" : ""}>{attachment.type.startsWith("image/") ? <FaImage /> : <FaFile />}</span>}
                    <div><strong>{attachment.name}</strong><small>{(attachment.size / 1024).toFixed(1)} KB</small></div>
                    <button type="button" onClick={() => removeAttachment(attachment.id)} aria-label={t("orderMaintenance.actions.removeAttachment")}><FaTrash /></button>
                  </div>
                ))}
                </>
              )}
              <button className="order-attachments__add" type="button" onClick={() => fileInputRef.current?.click()}>
                <FaPaperclip aria-hidden="true" /><span>{t("orderMaintenance.attachments.addFiles")}</span>
              </button>
            </div>
          </div>
        </div>

        <footer className="order-maintenance__footer">
          <p role="status">{message}</p>
          <button className="order-button order-button--primary" type="submit" disabled={saving}><FaFloppyDisk aria-hidden="true" />{uploadingFiles ? t("orderMaintenance.actions.uploading", { defaultValue: "Uploading files..." }) : saving ? t("orderMaintenance.actions.saving", { defaultValue: "Saving..." }) : t("orderMaintenance.actions.confirm")}</button>
        </footer>
      </form>

      {/* "New customer" pop-up. Kept OUTSIDE the order <form> so the customer
          form's submit never reaches the order save. */}
      <Modal
        show={showCustomerModal}
        onHide={() => setShowCustomerModal(false)}
        size="lg"
        centered
        scrollable
      >
        <Modal.Header closeButton>
          <Modal.Title>{t("orderMaintenance.actions.createCustomer")}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {showCustomerModal && (
            <CustomerCreateForm
              t={t}
              initialValues={order.customer ? null : { name: customerSearch.trim() }}
              onSaved={handleCustomerCreated}
              onCancel={() => setShowCustomerModal(false)}
            />
          )}
        </Modal.Body>
      </Modal>
    </section>
  );
}