import { APIShao } from "../../../../Shared/Utils/globalVar";

export class DeleteAppointmentServiceError extends Error {
  constructor(message, { status, response } = {}) {
    super(message);
    this.name = "DeleteAppointmentServiceError";
    this.status = status;
    this.response = response;
  }
}

export default class DeleteAppointmentService {
  constructor(baseUrl = APIShao) {
    this.baseUrl = String(baseUrl || "").replace(/\/$/, "");
  }

  /**
   * Hard-deletes one appointment by its id.
   *
   * Backend route:
   * DELETE /companies/{companyId}/appointments/{appointmentId}
   */
  async deleteAppointment({ companyId, appointmentId, signal } = {}) {
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
      method: "DELETE",
      credentials: "include",
      headers: { Accept: "application/json" },
      signal,
    });

    const data = await readResponse(response);

    if (!response.ok) {
      throw new DeleteAppointmentServiceError(
        data?.message || `Error deleting appointment: ${response.status}`,
        { status: response.status, response: data },
      );
    }

    return data;
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
