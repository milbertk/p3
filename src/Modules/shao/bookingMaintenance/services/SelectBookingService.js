import { APIShao } from "../../../../Shared/Utils/globalVar";

export class SelectBookingServiceError extends Error {
  constructor(message, { status, response } = {}) {
    super(message);

    this.name = "SelectBookingServiceError";
    this.status = status;
    this.response = response;
  }
}

export default class SelectBookingService {
  constructor(baseUrl = APIShao) {
    this.baseUrl = String(baseUrl || "").replace(/\/$/, "");
  }

  /**
   * Loads one booking with its full bundle (header + recurring ranges +
   * manual slots).
   *
   * Backend route:
   * GET /companies/{companyId}/bookings/{bookingConfigId}
   *
   * Returns the raw payload: { status, message, result: { config,
   * recurringRanges, manualSlots } }.
   */
  async selectBookingById({ companyId, bookingConfigId, signal } = {}) {
    const normalizedCompanyId = String(companyId || "").trim();
    const normalizedBookingId = String(bookingConfigId || "").trim();

    if (!normalizedCompanyId) {
      throw new TypeError("The selected company ID is required.");
    }

    if (!normalizedBookingId) {
      throw new TypeError("The booking config ID is required.");
    }

    const requestUrl =
      `${this.baseUrl}/companies/` +
      `${encodeURIComponent(normalizedCompanyId)}/` +
      `bookings/` +
      `${encodeURIComponent(normalizedBookingId)}`;

    const response = await fetch(requestUrl, {
      method: "GET",
      credentials: "include",
      headers: { Accept: "application/json" },
      signal,
    });

    const data = await readResponse(response);

    if (!response.ok) {
      throw new SelectBookingServiceError(
        data?.message || `Error selecting booking: ${response.status}`,
        { status: response.status, response: data },
      );
    }

    return data;
  }

  /**
   * Convenience helper: returns just the bundle (config + schedules) or null.
   */
  async getBookingBundle(request = {}) {
    const response = await this.selectBookingById(request);
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
