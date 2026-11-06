import { APIShao } from "../../../../Shared/Utils/globalVar";

export class SelectAppointmentServiceError extends Error {
  constructor(message, { status, response } = {}) {
    super(message);
    this.name = "SelectAppointmentServiceError";
    this.status = status;
    this.response = response;
  }
}

export default class SelectAppointmentService {
  constructor(baseUrl = APIShao) {
    this.baseUrl = String(baseUrl || "").replace(/\/$/, "");
  }

  /**
   * Loads one appointment by its id.
   *
   * Backend route:
   * GET /companies/{companyId}/appointments/{appointmentId}
   */
  async selectAppointmentById({ companyId, appointmentId, signal } = {}) {
    const normalizedCompanyId = String(companyId || "").trim();
    const normalizedAppointmentId = String(appointmentId || "").trim();

    if (!normalizedCompanyId) {
      throw new TypeError("The selected company ID is required.");
    }
    if (!normalizedAppointmentId) {
      throw new TypeError("The appointment ID is required.");
    }

    const requestUrl =
      `${this.baseUrl}/companies/` +
      `${encodeURIComponent(normalizedCompanyId)}/` +
      `appointments/` +
      `${encodeURIComponent(normalizedAppointmentId)}`;

    const response = await fetch(requestUrl, {
      method: "GET",
      credentials: "include",
      headers: { Accept: "application/json" },
      signal,
    });

    const data = await readResponse(response);

    if (!response.ok) {
      throw new SelectAppointmentServiceError(
        data?.message || `Error selecting appointment: ${response.status}`,
        { status: response.status, response: data },
      );
    }

    return data;
  }

  /** Convenience helper: returns just the appointment or null. */
  async getAppointment(request = {}) {
    const response = await this.selectAppointmentById(request);
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
