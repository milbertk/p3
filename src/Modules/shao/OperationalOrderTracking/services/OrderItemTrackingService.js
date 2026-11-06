import { APIShao } from "../../../../Shared/Utils/globalVar";

export class OrderItemTrackingServiceError extends Error {
  constructor(message, { status, response } = {}) {
    super(message);
    this.name = "OrderItemTrackingServiceError";
    this.status = status;
    this.response = response;
  }
}

export default class OrderItemTrackingService {
  constructor(baseUrl = APIShao) {
    this.baseUrl = String(baseUrl || "").replace(/\/$/, "");
  }

  // GET /companies/{companyId}/orders/{orderInternalId}/item-tracking
  // Returns { orderInternalId, orderStatus, items: [{ ..., currentStepId,
  //   currentStepStatus, stepOptions: [{ stepTemplateStepId, name, ... }] }] }
  async getByOrder({ companyId, orderInternalId, signal } = {}) {
    const c = String(companyId || "").trim();
    const o = String(orderInternalId || "").trim();
    if (!c) throw new TypeError("The company ID is required.");
    if (!o) throw new TypeError("The order ID is required.");

    const url =
      `${this.baseUrl}/companies/${encodeURIComponent(c)}/orders/` +
      `${encodeURIComponent(o)}/item-tracking`;

    const response = await fetch(url, {
      method: "GET",
      credentials: "include",
      headers: { Accept: "application/json" },
      signal,
    });
    const data = await readJson(response);
    if (!response.ok) {
      throw new OrderItemTrackingServiceError(
        data?.message || `Error loading item tracking: ${response.status}`,
        { status: response.status, response: data },
      );
    }
    return data?.result || null;
  }

  // POST /companies/{companyId}/orders/{orderInternalId}/item-tracking
  // Body: { orderItemId, currentStepId, currentStepStatus }
  // This is "update" and also "save first time" (same endpoint).
  async updateItemStep({ companyId, orderInternalId, orderItemId, currentStepId, currentStepStatus, signal } = {}) {
    const c = String(companyId || "").trim();
    const o = String(orderInternalId || "").trim();
    if (!c) throw new TypeError("The company ID is required.");
    if (!o) throw new TypeError("The order ID is required.");
    if (!orderItemId) throw new TypeError("The order item ID is required.");

    const url =
      `${this.baseUrl}/companies/${encodeURIComponent(c)}/orders/` +
      `${encodeURIComponent(o)}/item-tracking`;

    const response = await fetch(url, {
      method: "POST",
      credentials: "include",
      headers: { Accept: "application/json", "Content-Type": "application/json" },
      body: JSON.stringify({
        orderItemId: String(orderItemId),
        currentStepId: String(currentStepId || ""),
        currentStepStatus: String(currentStepStatus || ""),
      }),
      signal,
    });
    const data = await readJson(response);
    if (!response.ok) {
      throw new OrderItemTrackingServiceError(
        data?.message || `Error updating item step: ${response.status}`,
        { status: response.status, response: data },
      );
    }
    return data?.result || null;
  }
}

async function readJson(response) {
  const text = await response.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return { message: text };
  }
}
