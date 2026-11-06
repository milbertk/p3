import { useMemo, useRef, useState } from "react";
import {
  FaCalendarCheck,
  FaFile,
  FaFloppyDisk,
  FaImage,
  FaMagnifyingGlass,
  FaPaperclip,
  FaPlus,
  FaRoute,
  FaTrash,
  FaUserPlus,
} from "react-icons/fa6";
import "./OrderMaintenance.scss";

const MOCK_CUSTOMERS = [
  { id: "customer-001", name: "Andrea Vargas", phone: "+506 8888-2201", email: "andrea@example.com" },
  { id: "customer-002", name: "Carlos Jiménez", phone: "+506 8700-1134", email: "carlos@example.com" },
  { id: "customer-003", name: "María Fernández", phone: "+506 8311-4090", email: "maria@example.com" },
];

const MOCK_PRODUCTS = [
  { id: "product-001", nameKey: "orderMaintenance.mock.products.cuttingBoard", internalCode: "PRD-001", price: 23500 },
  { id: "product-002", nameKey: "orderMaintenance.mock.products.grillBoard", internalCode: "PRD-002", price: 27000 },
  { id: "product-003", nameKey: "orderMaintenance.mock.products.customService", internalCode: "SRV-001", price: 0 },
];

// Temporary local data for the general tracking dropdown.
// Replace with real "general" trackings (SearchTrackingService, GENERAL type) later.
const MOCK_GENERAL_TRACKINGS = [
  { id: "tracking-gen-001", name: "Standard delivery flow", internalCode: "TRK-GEN-001" },
  { id: "tracking-gen-002", name: "Express flow", internalCode: "TRK-GEN-002" },
  { id: "tracking-gen-003", name: "Custom production flow", internalCode: "TRK-GEN-003" },
];

const INITIAL_ORDER = {
  customer: MOCK_CUSTOMERS[0],
  channel: "whatsapp",
  startDate: "2026-07-18",
  estimatedDeliveryDate: "2026-07-25",
  items: [
    { productId: "product-001", nameKey: "orderMaintenance.mock.products.cuttingBoard", internalCode: "PRD-001", quantity: 2, unitPrice: 23500, additionalPrice: 0, taxPercentage: 13, taxAmount: 0 },
    { productId: "product-002", nameKey: "orderMaintenance.mock.products.grillBoard", internalCode: "PRD-002", quantity: 1, unitPrice: 27000, additionalPrice: 0, taxPercentage: 0, taxAmount: 0 },
  ],
  notes: "Personalized cutting board with the attached family logo. Confirm the engraving before production.",
  attachments: [
    { id: "mock-image", name: "family-logo.png", size: 262144, type: "image/png", previewUrl: null, mockKind: "image" },
    { id: "mock-pdf", name: "measurements.pdf", size: 421888, type: "application/pdf", previewUrl: null, mockKind: "pdf" },
  ],
  // Tax mode for the whole order: "amount" (default) or "percentage".
  taxMode: "amount",
  // Tracking mode: general ON by default, with a chosen general tracking.
  useGeneralTracking: true,
  generalTrackingId: "tracking-gen-001",
  status: "scheduled",
};

export default function OrderMaintenance({ t }) {
  const [order, setOrder] = useState(INITIAL_ORDER);
  const [customerSearch, setCustomerSearch] = useState(INITIAL_ORDER.customer.name);
  const [productSearch, setProductSearch] = useState("");
  const [message, setMessage] = useState("");
  const fileInputRef = useRef(null);

  const customerResults = useMemo(() => {
    const term = customerSearch.trim().toLowerCase();
    if (!term || order.customer) return [];
    return MOCK_CUSTOMERS.filter((customer) =>
      `${customer.name} ${customer.phone} ${customer.email}`.toLowerCase().includes(term),
    ).slice(0, 6);
  }, [customerSearch, order.customer]);

  const productResults = useMemo(() => {
    const term = productSearch.trim().toLowerCase();
    if (!term) return [];
    const selectedIds = new Set(order.items.map((item) => item.productId));
    return MOCK_PRODUCTS.filter((product) => !selectedIds.has(product.id))
      .filter((product) =>
        `${t(product.nameKey)} ${product.internalCode}`.toLowerCase().includes(term),
      )
      .slice(0, 6);
  }, [order.items, productSearch, t]);

  // Per-line computed values. Taxes depend on the order tax mode:
  //   "percentage" -> tax = base * (taxPercentage / 100)
  //   "amount"     -> tax = the typed taxAmount
  // (additionalPrice is kept in state/DB but no longer shown in the UI.)
  const computeLine = (item) => {
    const base = (Number(item.quantity) || 0) *
      ((Number(item.unitPrice) || 0) + (Number(item.additionalPrice) || 0));

    const taxAmount =
      order.taxMode === "percentage"
        ? base * ((Number(item.taxPercentage) || 0) / 100)
        : Number(item.taxAmount) || 0;

    return { base, taxAmount, subtotal: base + taxAmount };
  };

  const total = useMemo(
    () => order.items.reduce((sum, item) => sum + computeLine(item).subtotal, 0),
    [order.items],
  );

  const selectCustomer = (customer) => {
    setOrder((current) => ({ ...current, customer }));
    setCustomerSearch(customer.name);
    setMessage("");
  };

  const clearCustomer = () => {
    setOrder((current) => ({ ...current, customer: null }));
    setCustomerSearch("");
  };

  const addProduct = (product) => {
    setOrder((current) => ({
      ...current,
      items: [
        ...current.items,
        {
          productId: product.id,
          nameKey: product.nameKey,
          internalCode: product.internalCode,
          quantity: 1,
          unitPrice: product.price,
          additionalPrice: 0,
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

  // Toggle the general tracking mode. When turning it off, the general tracking
  // selection is cleared (each product will use its own product/category steps).
  const handleUseGeneralTrackingChange = (event) => {
    const useGeneral = event.target.checked;
    setMessage("");
    setOrder((current) => ({
      ...current,
      useGeneralTracking: useGeneral,
      generalTrackingId: useGeneral ? current.generalTrackingId : "",
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
    if (order.useGeneralTracking && !order.generalTrackingId) {
      setMessage(
        t("orderMaintenance.messages.generalTrackingRequired", {
          defaultValue: "Please choose a general tracking or turn the option off.",
        }),
      );
      return;
    }

    const payload = {
      ...order,
      customerId: order.customer.id,
      taxMode: order.taxMode,
      items: order.items.map((item, index) => {
        const line = computeLine(item);
        return {
          ...item,
          order: index + 1,
          additionalPrice: Number(item.additionalPrice) || 0,
          // Store the percentage only in percentage mode; always store the
          // resolved amount so the backend keeps a fixed record.
          taxPercentage:
            order.taxMode === "percentage"
              ? Number(item.taxPercentage) || 0
              : null,
          taxAmount: line.taxAmount,
          subtotal: line.subtotal,
        };
      }),
      total,
      // Tracking mode: if general is off, each product uses its own tracking.
      useGeneralTracking: order.useGeneralTracking,
      generalTrackingId: order.useGeneralTracking ? order.generalTrackingId : "",
    };

    // Temporary mock save. Replace this block with the order service later.
    // Example: await OrderService.create(payload);
    console.log("Order saved", payload);

    setMessage(t("orderMaintenance.messages.saved"));
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
          <FaCalendarCheck aria-hidden="true" /> {t("orderMaintenance.status.scheduled")}
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
                <div className="order-autocomplete">
                  <FaMagnifyingGlass aria-hidden="true" />
                  <input
                    id="customer-search"
                    value={customerSearch}
                    onChange={(event) => {
                      setCustomerSearch(event.target.value);
                      if (order.customer) setOrder((current) => ({ ...current, customer: null }));
                    }}
                    placeholder={t("orderMaintenance.customer.searchPlaceholder")}
                  />
                  {customerResults.length > 0 && (
                    <div className="order-autocomplete__results">
                      {customerResults.map((customer) => (
                        <button key={customer.id} type="button" onClick={() => selectCustomer(customer)}>
                          <span>{customer.name}</span>
                          <small>{customer.phone} · {customer.email}</small>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <button
                  className="order-icon-button order-icon-button--primary"
                  type="button"
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
                    <span>{t(product.nameKey)}</span>
                    <small>{product.internalCode}</small>
                    <FaPlus aria-hidden="true" />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="order-items">
            {order.items.length === 0 ? (
              <div className="order-items__empty">{t("orderMaintenance.products.empty")}</div>
            ) : <>
              <div className="order-item order-item--header">
                <span>{t("orderMaintenance.products.columns.product")}</span>
                <span>{t("orderMaintenance.products.columns.code")}</span>
                <span>{t("orderMaintenance.fields.quantity")}</span>
                <span>{t("orderMaintenance.fields.unitPrice")}</span>
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
                  <strong>{t(item.nameKey)}</strong>
                </div>
                <span className="order-item__code">{item.internalCode}</span>
                <label><span>{t("orderMaintenance.fields.quantity")}</span><input type="number" min="1" value={item.quantity} onChange={(event) => updateItem(index, "quantity", event.target.value)} /></label>
                <label><span>{t("orderMaintenance.fields.unitPrice")}</span><input type="number" min="0" value={item.unitPrice} onChange={(event) => updateItem(index, "unitPrice", event.target.value)} /></label>
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

        <div className="order-panel">
          <div className="order-panel__title">
            <span>3</span>
            <div>
              <h2>{t("orderMaintenance.tracking.title", { defaultValue: "Tracking" })}</h2>
              <p>
                {t("orderMaintenance.tracking.description", {
                  defaultValue: "Choose how this order will be tracked.",
                })}
              </p>
            </div>
          </div>

          <label className="order-tracking-check">
            <input
              type="checkbox"
              checked={Boolean(order.useGeneralTracking)}
              onChange={handleUseGeneralTrackingChange}
            />
            <span>
              {t("orderMaintenance.tracking.useGeneralLabel", {
                defaultValue: "Use general tracking mode",
              })}
            </span>
          </label>

          {order.useGeneralTracking ? (
            <div className="order-field">
              <label htmlFor="order-general-tracking">
                <FaRoute aria-hidden="true" />{" "}
                {t("orderMaintenance.tracking.generalLabel", {
                  defaultValue: "General tracking",
                })}
              </label>
              <select
                id="order-general-tracking"
                value={order.generalTrackingId}
                onChange={(event) =>
                  setOrder((current) => ({
                    ...current,
                    generalTrackingId: event.target.value,
                  }))
                }
              >
                <option value="">
                  {t("orderMaintenance.tracking.generalPlaceholder", {
                    defaultValue: "Select a general tracking",
                  })}
                </option>
                {MOCK_GENERAL_TRACKINGS.map((tracking) => (
                  <option key={tracking.id} value={tracking.id}>
                    {tracking.name} · {tracking.internalCode}
                  </option>
                ))}
              </select>
              <small>
                {t("orderMaintenance.tracking.generalHelp", {
                  defaultValue:
                    "The whole order will follow this single general tracking flow.",
                })}
              </small>
            </div>
          ) : (
            <p className="order-tracking-note">
              {t("orderMaintenance.tracking.perProductNote", {
                defaultValue:
                  "General tracking is off: each product will use its own product or category tracking steps. Use this when your products need different tracking flows.",
              })}
            </p>
          )}
        </div>

        <div className="order-panel">
          <div className="order-panel__title">
            <span>4</span>
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
          <button className="order-button order-button--primary" type="submit"><FaFloppyDisk aria-hidden="true" />{t("orderMaintenance.actions.confirm")}</button>
        </footer>
      </form>
    </section>
  );
}