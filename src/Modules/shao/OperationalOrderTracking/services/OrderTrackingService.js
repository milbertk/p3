import { APIShao } from "../../../../Shared/Utils/globalVar";

export class OrderTrackingServiceError extends Error {
  constructor(message, { status, response } = {}) {
    super(message);
    this.name = "OrderTrackingServiceError";
    this.status = status;
    this.response = response;
  }
}

export default class OrderTrackingService {
  constructor(baseUrl = APIShao) {
    this.baseUrl = String(baseUrl || "").replace(/\/$/, "");
  }

  // GET /companies/{companyId}/orders/search
  // Loads the order list. Tracking stages are loaded separately for each order.
  async searchOrders({ companyId, signal } = {}) {
    const c = String(companyId || "").trim();
    if (!c) throw new TypeError("The company ID is required.");

    const url = `${this.baseUrl}/companies/${encodeURIComponent(c)}/orders/search`;
    const response = await fetch(url, {
      method: "GET",
      credentials: "include",
      headers: { Accept: "application/json" },
      signal,
    });

    const data = await readJson(response);
    if (!response.ok) {
      throw new OrderTrackingServiceError(
        data?.message || `Error loading orders: ${response.status}`,
        { status: response.status, response: data },
      );
    }

    const result = data?.result ?? data;
    const orders = Array.isArray(result)
      ? result
      : [result?.orders, result?.items, result?.rows, result?.data].find(
          Array.isArray,
        );

    if (!orders) {
      throw new OrderTrackingServiceError(
        "The orders search returned an unexpected response format.",
        { response: data },
      );
    }

    return orders;
  }

  // GET /companies/{companyId}/order-trackings/{orderInternalId}
  // Returns the stages, comments, and attachments for one order.
  async getByOrder({ companyId, orderInternalId, signal } = {}) {
    const c = String(companyId || "").trim();
    const o = String(orderInternalId || "").trim();

    if (!c) throw new TypeError("The company ID is required.");
    if (!o) throw new TypeError("The order ID is required.");

    const url =
      `${this.baseUrl}/companies/${encodeURIComponent(c)}/order-trackings/` +
      `${encodeURIComponent(o)}`;

    const response = await fetch(url, {
      method: "GET",
      credentials: "include",
      headers: { Accept: "application/json" },
      signal,
    });

    const data = await readJson(response);
    if (!response.ok) {
      throw new OrderTrackingServiceError(
        data?.message || `Error loading tracking: ${response.status}`,
        { status: response.status, response: data },
      );
    }

    return data;
  }

  async getStages(request = {}) {
    const response = await this.getByOrder(request);
    return response?.result?.stages || [];
  }

  // POST /companies/{companyId}/order-trackings/stages
  // Body: { stage: {...}, comments: [...], attachments: [...] }
  async saveStage({ companyId, bundle, signal } = {}) {
    const c = String(companyId || "").trim();

    if (!c) throw new TypeError("The company ID is required.");
    if (!bundle || typeof bundle !== "object") {
      throw new TypeError("The stage bundle is required.");
    }

    const payload = {
      stage: bundle.stage || {},
      comments: Array.isArray(bundle.comments) ? bundle.comments : [],
      attachments: Array.isArray(bundle.attachments) ? bundle.attachments : [],
    };

    const url =
      `${this.baseUrl}/companies/${encodeURIComponent(c)}/order-trackings/stages`;

    const response = await fetch(url, {
      method: "POST",
      credentials: "include",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      signal,
    });

    const data = await readJson(response);
    if (!response.ok) {
      throw new OrderTrackingServiceError(
        data?.message || `Error saving stage: ${response.status}`,
        { status: response.status, response: data },
      );
    }

    return data;
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