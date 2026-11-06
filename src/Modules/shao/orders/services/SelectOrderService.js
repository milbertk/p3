import { APIShao } from "../../../../Shared/Utils/globalVar";

export class SelectOrderServiceError extends Error {
  constructor(message, { status, response } = {}) {
    super(message);
    this.name = "SelectOrderServiceError";
    this.status = status;
    this.response = response;
  }
}

export default class SelectOrderService {
  constructor(baseUrl = APIShao) {
    this.baseUrl = String(baseUrl || "").replace(/\/$/, "");
  }

  /**
   * Loads one order with its full bundle (order header + items).
   *
   * Backend route:
   * GET /companies/{companyId}/orders/{orderInternalId}
   */
  async selectOrderById({ companyId, orderInternalId, signal } = {}) {
    const normalizedCompanyId = String(companyId || "").trim();
    const normalizedOrderId = String(orderInternalId || "").trim();

    if (!normalizedCompanyId) {
      throw new TypeError("The selected company ID is required.");
    }
    if (!normalizedOrderId) {
      throw new TypeError("The order ID is required.");
    }

    const requestUrl =
      `${this.baseUrl}/companies/` +
      `${encodeURIComponent(normalizedCompanyId)}/` +
      `orders/` +
      `${encodeURIComponent(normalizedOrderId)}`;

    const response = await fetch(requestUrl, {
      method: "GET",
      credentials: "include",
      headers: { Accept: "application/json" },
      signal,
    });

    const data = await readResponse(response);

    if (!response.ok) {
      throw new SelectOrderServiceError(
        data?.message || `Error selecting order: ${response.status}`,
        { status: response.status, response: data },
      );
    }

    return data;
  }

  /** Convenience helper: returns just the bundle (order + items) or null. */
  async getOrderBundle(request = {}) {
    const response = await this.selectOrderById(request);
    return response?.result || null;
  }
}

async function readResponse(response) {
  const rawText = await response.text();
  if (!rawText) {
    return {};
  }
  try {
    return JSON.parse(rawText);
  } catch {
    return { message: rawText };
  }
}
