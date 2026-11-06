import { APIShao } from "../../../../Shared/Utils/globalVar";

export class AppointmentStatusServiceError extends Error {
  constructor(message, { status, response } = {}) {
    super(message);
    this.name = "AppointmentStatusServiceError";
    this.status = status;
    this.response = response;
  }
}

// Finish / cancel a real appointment (SCHEDULED -> DONE | CANCELLED).
export default class AppointmentStatusService {
  constructor(baseUrl = APIShao) {
    this.baseUrl = String(baseUrl || "").replace(/\/$/, "");
  }

  // POST /companies/{companyId}/appointments/{appointmentId}/status { status }
  async changeStatus({ companyId, appointmentId, status, signal } = {}) {
    const c = String(companyId || "").trim();
    const a = String(appointmentId || "").trim();
    if (!c) throw new TypeError("The company ID is required.");
    if (!a) throw new TypeError("The appointment ID is required.");

    const url =
      `${this.baseUrl}/companies/${encodeURIComponent(c)}/appointments/` +
      `${encodeURIComponent(a)}/status`;

    const response = await fetch(url, {
      method: "POST",
      credentials: "include",
      headers: { Accept: "application/json", "Content-Type": "application/json" },
      body: JSON.stringify({ status: String(status || "") }),
      signal,
    });
    const data = await readJson(response);
    if (!response.ok) {
      throw new AppointmentStatusServiceError(
        data?.message || `Error changing status: ${response.status}`,
        { status: response.status, response: data },
      );
    }
    return data?.result || null;
  }

  finish(args) {
    return this.changeStatus({ ...args, status: "DONE" });
  }
  cancel(args) {
    return this.changeStatus({ ...args, status: "CANCELLED" });
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
