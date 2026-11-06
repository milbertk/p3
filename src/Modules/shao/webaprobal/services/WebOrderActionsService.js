import { APIShao } from "../../../../Shared/Utils/globalVar";

export class WebOrderActionsServiceError extends Error {
  constructor(message, { status, response } = {}) {
    super(message);
    this.name = "WebOrderActionsServiceError";
    this.status = status;
    this.response = response;
  }
}

export default class WebOrderActionsService {
  constructor(baseUrl = APIShao) {
    this.baseUrl = String(baseUrl || "").replace(/\/$/, "");
  }

  // POST .../web-orders/{id}/approve -> creates the real order + sets APPROVED.
  async approve({ companyId, webOrderRequestId, signal } = {}) {
    const c = String(companyId || "").trim();
    const id = String(webOrderRequestId || "").trim();
    if (!c) throw new TypeError("The company ID is required.");
    if (!id) throw new TypeError("The web order ID is required.");

    const url =
      `${this.baseUrl}/companies/${encodeURIComponent(c)}/web-orders/` +
      `${encodeURIComponent(id)}/approve`;

    const response = await fetch(url, {
      method: "POST",
      credentials: "include",
      headers: { Accept: "application/json", "Content-Type": "application/json" },
      signal,
    });

    const data = await readJson(response);
    if (!response.ok) {
      throw new WebOrderActionsServiceError(
        data?.message || `Error approving web order: ${response.status}`,
        { status: response.status, response: data },
      );
    }
    return data;
  }

  // POST .../web-orders/{id}/status with { status } -> reject (or any status).
  async updateStatus({ companyId, webOrderRequestId, status, signal } = {}) {
    const c = String(companyId || "").trim();
    const id = String(webOrderRequestId || "").trim();
    if (!c) throw new TypeError("The company ID is required.");
    if (!id) throw new TypeError("The web order ID is required.");

    const url =
      `${this.baseUrl}/companies/${encodeURIComponent(c)}/web-orders/` +
      `${encodeURIComponent(id)}/status`;

    const response = await fetch(url, {
      method: "POST",
      credentials: "include",
      headers: { Accept: "application/json", "Content-Type": "application/json" },
      body: JSON.stringify({ status: String(status || "").toUpperCase() }),
      signal,
    });

    const data = await readJson(response);
    if (!response.ok) {
      throw new WebOrderActionsServiceError(
        data?.message || `Error updating web order: ${response.status}`,
        { status: response.status, response: data },
      );
    }
    return data;
  }

  // Convenience: reject = updateStatus REJECTED.
  reject(request = {}) {
    return this.updateStatus({ ...request, status: "REJECTED" });
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