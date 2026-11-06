import { APIShao } from "../../../../Shared/Utils/globalVar";

export class OrderDetailsServiceError extends Error {
  constructor(message, { status, response } = {}) {
    super(message);
    this.name = "OrderDetailsServiceError";
    this.status = status;
    this.response = response;
  }
}

export default class OrderDetailsService {
  constructor(baseUrl = APIShao) {
    this.baseUrl = String(baseUrl || "").replace(/\/$/, "");
  }

  base(companyId, orderInternalId) {
    const c = String(companyId || "").trim();
    const o = String(orderInternalId || "").trim();
    if (!c) throw new TypeError("The company ID is required.");
    if (!o) throw new TypeError("The order ID is required.");
    return `${this.baseUrl}/companies/${encodeURIComponent(c)}/orders/${encodeURIComponent(o)}`;
  }

  // GET /details -> { comments: [...], attachments: [...] }
  async getDetails({ companyId, orderInternalId, signal } = {}) {
    const response = await fetch(`${this.base(companyId, orderInternalId)}/details`, {
      method: "GET",
      credentials: "include",
      headers: { Accept: "application/json" },
      signal,
    });
    const data = await readJson(response);
    if (!response.ok) {
      throw new OrderDetailsServiceError(
        data?.message || `Error loading details: ${response.status}`,
        { status: response.status, response: data },
      );
    }
    return data?.result || { comments: [], attachments: [] };
  }

  // POST /comments { commentText } -> fresh details
  async addComment({ companyId, orderInternalId, commentText, signal } = {}) {
    const response = await fetch(`${this.base(companyId, orderInternalId)}/comments`, {
      method: "POST",
      credentials: "include",
      headers: { Accept: "application/json", "Content-Type": "application/json" },
      body: JSON.stringify({ commentText: String(commentText || "") }),
      signal,
    });
    const data = await readJson(response);
    if (!response.ok) {
      throw new OrderDetailsServiceError(
        data?.message || `Error adding comment: ${response.status}`,
        { status: response.status, response: data },
      );
    }
    return data?.result || null;
  }

  // DELETE /comments/{commentId} -> fresh details
  async deleteComment({ companyId, orderInternalId, commentId, signal } = {}) {
    const response = await fetch(
      `${this.base(companyId, orderInternalId)}/comments/${encodeURIComponent(commentId)}`,
      { method: "DELETE", credentials: "include", headers: { Accept: "application/json" }, signal },
    );
    const data = await readJson(response);
    if (!response.ok) {
      throw new OrderDetailsServiceError(
        data?.message || `Error deleting comment: ${response.status}`,
        { status: response.status, response: data },
      );
    }
    return data?.result || null;
  }

  // POST /attachments { attachments: [{ url, storagePath, fileName, fileType, fileSize }] }
  async addAttachments({ companyId, orderInternalId, attachments, signal } = {}) {
    const response = await fetch(`${this.base(companyId, orderInternalId)}/attachments`, {
      method: "POST",
      credentials: "include",
      headers: { Accept: "application/json", "Content-Type": "application/json" },
      body: JSON.stringify({ attachments: Array.isArray(attachments) ? attachments : [] }),
      signal,
    });
    const data = await readJson(response);
    if (!response.ok) {
      throw new OrderDetailsServiceError(
        data?.message || `Error saving attachments: ${response.status}`,
        { status: response.status, response: data },
      );
    }
    return data?.result || null;
  }

  // DELETE /attachments/{attachmentId} -> { details, storagePath }
  async deleteAttachment({ companyId, orderInternalId, attachmentId, signal } = {}) {
    const response = await fetch(
      `${this.base(companyId, orderInternalId)}/attachments/${encodeURIComponent(attachmentId)}`,
      { method: "DELETE", credentials: "include", headers: { Accept: "application/json" }, signal },
    );
    const data = await readJson(response);
    if (!response.ok) {
      throw new OrderDetailsServiceError(
        data?.message || `Error deleting attachment: ${response.status}`,
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
