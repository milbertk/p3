import { APIShao } from "../../../../Shared/Utils/globalVar";

export class SaveOrderServiceError extends Error {
  constructor(message, { status, statusText, response, request, cause } = {}) {
    super(message);
    this.name = "SaveOrderServiceError";
    this.status = status;
    this.statusText = statusText;
    this.response = response;
    this.request = request;
    this.cause = cause;
  }
}

export default class SaveOrderService {
  constructor(baseUrl = APIShao) {
    this.baseUrl = String(baseUrl || "").replace(/\/$/, "");
  }

  /**
   * Creates or updates an order and rewrites its items.
   *
   * Backend route:
   * POST /companies/{companyId}/orders
   *
   * @param {object} params
   * @param {string} params.companyId
   * @param {object} params.order  the bundle: { order, items }
   */
  async saveOrder({ companyId, order, signal } = {}) {
    const normalizedCompanyId = String(companyId || "").trim();
    if (!normalizedCompanyId) {
      throw new TypeError("The selected company ID is required.");
    }
    if (!order || typeof order !== "object" || Array.isArray(order)) {
      throw new TypeError("The order object is required.");
    }

    const payload = {
      order: order.order || {},
      items: Array.isArray(order.items) ? order.items : [],
    };

    const requestUrl =
      `${this.baseUrl}/companies/` +
      `${encodeURIComponent(normalizedCompanyId)}` +
      "/orders";

    const requestDetails = { method: "POST", url: requestUrl, payload };

    let response;
    try {
      response = await fetch(requestUrl, {
        method: "POST",
        credentials: "include",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
        signal,
      });
    } catch (cause) {
      logOrderServiceError({
        title: "The request failed before receiving an HTTP response",
        request: requestDetails,
        cause,
      });
      throw new SaveOrderServiceError(
        cause?.name === "AbortError"
          ? "The order request was cancelled."
          : "The server could not be reached while saving the order.",
        {
          status: 0,
          statusText: "Network error",
          response: null,
          request: requestDetails,
          cause,
        },
      );
    }

    const data = await readResponse(response);

    if (!response.ok) {
      const serviceError = new SaveOrderServiceError(
        data?.message || `Error saving order: ${response.status}`,
        {
          status: response.status,
          statusText: response.statusText,
          response: data,
          request: requestDetails,
        },
      );
      logOrderServiceError({
        title: "The backend rejected the order request",
        request: requestDetails,
        response: {
          status: response.status,
          statusText: response.statusText,
          body: data,
        },
        cause: serviceError,
      });
      throw serviceError;
    }

    return data;
  }
}

function logOrderServiceError({ title, request, response, cause }) {
  console.group(`[SaveOrderService] ${title}`);
  console.error("Request:", request);
  if (response) {
    console.error("Response:", response);
  }
  console.error("Error:", cause);
  console.groupEnd();
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
