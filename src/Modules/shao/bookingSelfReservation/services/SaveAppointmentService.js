import { APIShao } from "../../../../Shared/Utils/globalVar";

export class SaveAppointmentServiceError extends Error {
  constructor(message, { status, statusText, response, request, cause } = {}) {
    super(message);
    this.name = "SaveAppointmentServiceError";
    this.status = status;
    this.statusText = statusText;
    this.response = response;
    this.request = request;
    this.cause = cause;
  }
}

export default class SaveAppointmentService {
  constructor(baseUrl = APIShao) {
    this.baseUrl = String(baseUrl || "").replace(/\/$/, "");
  }

  /**
   * Creates or updates an appointment.
   *
   * Backend route:
   * POST /companies/{companyId}/appointments
   *
   * If appointment.appointmentId is empty (or does not exist) the backend
   * creates a new record; otherwise it updates it. The response result holds
   * { appointment, conflictCount } (conflictCount is a non-blocking warning).
   */
  async saveAppointment({ companyId, appointment, signal } = {}) {
    const normalizedCompanyId = String(companyId || "").trim();
    if (!normalizedCompanyId) {
      throw new TypeError("The selected company ID is required.");
    }
    if (!appointment || typeof appointment !== "object" || Array.isArray(appointment)) {
      throw new TypeError("The appointment object is required.");
    }

    const requestUrl =
      `${this.baseUrl}/companies/` +
      `${encodeURIComponent(normalizedCompanyId)}` +
      "/appointments";

    const requestDetails = { method: "POST", url: requestUrl, payload: appointment };

    let response;
    try {
      response = await fetch(requestUrl, {
        method: "POST",
        credentials: "include",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(appointment),
        signal,
      });
    } catch (cause) {
      logAppointmentServiceError({
        title: "The request failed before receiving an HTTP response",
        request: requestDetails,
        cause,
      });
      throw new SaveAppointmentServiceError(
        cause?.name === "AbortError"
          ? "The appointment request was cancelled."
          : "The server could not be reached while saving the appointment.",
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
      const serviceError = new SaveAppointmentServiceError(
        data?.message || `Error saving appointment: ${response.status}`,
        {
          status: response.status,
          statusText: response.statusText,
          response: data,
          request: requestDetails,
        },
      );
      logAppointmentServiceError({
        title: "The backend rejected the appointment request",
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

function logAppointmentServiceError({ title, request, response, cause }) {
  console.group(`[SaveAppointmentService] ${title}`);
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
