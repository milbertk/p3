import { APIShao } from "../../../../Shared/Utils/globalVar";

export class SaveBookingServiceError extends Error {
  constructor(
    message,
    { status, statusText, response, request, cause } = {},
  ) {
    super(message);

    this.name = "SaveBookingServiceError";
    this.status = status;
    this.statusText = statusText;
    this.response = response;
    this.request = request;
    this.cause = cause;
  }
}

export default class SaveBookingService {
  constructor(baseUrl = APIShao) {
    this.baseUrl = String(baseUrl || "").replace(/\/$/, "");
  }

  /**
   * Creates or updates a booking configuration and rewrites its schedules.
   *
   * Backend route:
   * POST /companies/{companyId}/bookings
   *
   * @param {object} params
   * @param {string} params.companyId
   * @param {object} params.booking  the full bundle:
   *   {
   *     config: { bookingConfigId, serviceProductId, name, ... },
   *     recurringRanges: [ { dayOfWeek, startTime, endTime, appointments, active }, ... ],
   *     manualSlots:     [ { slotDate, allDay, startTime, endTime, appointments }, ... ],
   *   }
   *
   * If config.bookingConfigId is empty (or does not exist) the backend creates
   * a new booking; otherwise it updates it. Recurring ranges are fully
   * replaced; manual slots are replaced from today forward.
   */
  async saveBooking({ companyId, booking, signal } = {}) {
    const normalizedCompanyId = String(companyId || "").trim();

    if (!normalizedCompanyId) {
      throw new TypeError("The selected company ID is required.");
    }

    if (
      !booking ||
      typeof booking !== "object" ||
      Array.isArray(booking)
    ) {
      throw new TypeError("The booking object is required.");
    }

    const payload = {
      config: booking.config || {},
      recurringRanges: Array.isArray(booking.recurringRanges)
        ? booking.recurringRanges
        : [],
      manualSlots: Array.isArray(booking.manualSlots)
        ? booking.manualSlots
        : [],
    };

    const requestUrl =
      `${this.baseUrl}/companies/` +
      `${encodeURIComponent(normalizedCompanyId)}` +
      "/bookings";

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
      logBookingServiceError({
        title: "The request failed before receiving an HTTP response",
        request: requestDetails,
        cause,
      });

      throw new SaveBookingServiceError(
        cause?.name === "AbortError"
          ? "The booking request was cancelled."
          : "The server could not be reached while saving the booking.",
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
      const serviceError = new SaveBookingServiceError(
        data?.message || `Error saving booking: ${response.status}`,
        {
          status: response.status,
          statusText: response.statusText,
          response: data,
          request: requestDetails,
        },
      );

      logBookingServiceError({
        title: "The backend rejected the booking request",
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

function logBookingServiceError({ title, request, response, cause }) {
  console.group(`[SaveBookingService] ${title}`);
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
