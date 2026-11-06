import { APIShao } from "../../../../Shared/Utils/globalVar";

export class AppointmentRequestActionsError extends Error {
  constructor(message, { status, response } = {}) {
    super(message);
    this.name = "AppointmentRequestActionsError";
    this.status = status;
    this.response = response;
  }
}

// Approve / reject a PENDING appointment request.
export default class AppointmentRequestActionsService {
  constructor(baseUrl = APIShao) {
    this.baseUrl = String(baseUrl || "").replace(/\/$/, "");
  }

  base(companyId, appointmentId) {
    const c = String(companyId || "").trim();
    const a = String(appointmentId || "").trim();
    if (!c) throw new TypeError("The company ID is required.");
    if (!a) throw new TypeError("The appointment ID is required.");
    return `${this.baseUrl}/companies/${encodeURIComponent(c)}/appointment-requests/${encodeURIComponent(a)}`;
  }

  // POST /approve -> SCHEDULED + email
  async approve({ companyId, appointmentId, signal } = {}) {
    const response = await fetch(`${this.base(companyId, appointmentId)}/approve`, {
      method: "POST",
      credentials: "include",
      headers: { Accept: "application/json" },
      signal,
    });
    const data = await readJson(response);
    if (!response.ok) {
      throw new AppointmentRequestActionsError(
        data?.message || `Error approving request: ${response.status}`,
        { status: response.status, response: data },
      );
    }
    return data?.result || null;
  }

  // POST /reject { reason? } -> REJECTED (+ optional reason email)
  async reject({ companyId, appointmentId, reason, signal } = {}) {
    const response = await fetch(`${this.base(companyId, appointmentId)}/reject`, {
      method: "POST",
      credentials: "include",
      headers: { Accept: "application/json", "Content-Type": "application/json" },
      body: JSON.stringify({ reason: String(reason || "") }),
      signal,
    });
    const data = await readJson(response);
    if (!response.ok) {
      throw new AppointmentRequestActionsError(
        data?.message || `Error rejecting request: ${response.status}`,
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
