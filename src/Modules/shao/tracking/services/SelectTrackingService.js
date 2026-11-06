import { APIShao } from "../../../../Shared/Utils/globalVar";

export class SelectTrackingServiceError extends Error {
  constructor(message, { status, response } = {}) {
    super(message);
    this.name = "SelectTrackingServiceError";
    this.status = status;
    this.response = response;
  }
}

export default class SelectTrackingService {
  constructor(baseUrl = APIShao) {
    this.baseUrl = String(baseUrl || "").replace(/\/$/, "");
  }

  /**
   * Loads one tracking with its full bundle (header + ordered steps).
   *
   * Backend route:
   * GET /companies/{companyId}/trackings/{trackingConfigId}
   */
  async selectTrackingById({ companyId, trackingConfigId, signal } = {}) {
    const normalizedCompanyId = String(companyId || "").trim();
    const normalizedTrackingId = String(trackingConfigId || "").trim();

    if (!normalizedCompanyId) {
      throw new TypeError("The selected company ID is required.");
    }
    if (!normalizedTrackingId) {
      throw new TypeError("The tracking config ID is required.");
    }

    const requestUrl =
      `${this.baseUrl}/companies/` +
      `${encodeURIComponent(normalizedCompanyId)}/` +
      `trackings/` +
      `${encodeURIComponent(normalizedTrackingId)}`;

    const response = await fetch(requestUrl, {
      method: "GET",
      credentials: "include",
      headers: { Accept: "application/json" },
      signal,
    });

    const data = await readResponse(response);

    if (!response.ok) {
      throw new SelectTrackingServiceError(
        data?.message || `Error selecting tracking: ${response.status}`,
        { status: response.status, response: data },
      );
    }

    return data;
  }

  /** Convenience helper: returns just the bundle (config + steps) or null. */
  async getTrackingBundle(request = {}) {
    const response = await this.selectTrackingById(request);
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
