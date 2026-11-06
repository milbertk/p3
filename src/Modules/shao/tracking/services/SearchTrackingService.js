import { APIShao } from "../../../../Shared/Utils/globalVar";

export class SearchTrackingServiceError extends Error {
  constructor(message, { status, response } = {}) {
    super(message);
    this.name = "SearchTrackingServiceError";
    this.status = status;
    this.response = response;
  }
}

export default class SearchTrackingService {
  constructor(baseUrl = APIShao) {
    this.baseUrl = String(baseUrl || "").replace(/\/$/, "");
  }

  /**
   * Searches tracking headers using optional filters.
   *
   * Backend route:
   * GET /companies/{companyId}/trackings/search?<filters>
   *
   * Supported filters: term, name, internalCode, targetType, categoryId,
   * productId, limit, offset. Only the provided ones are sent.
   */
  async searchTracking({ companyId, filters = {}, signal } = {}) {
    const normalizedCompanyId = String(companyId || "").trim();
    if (!normalizedCompanyId) {
      throw new TypeError("The selected company ID is required.");
    }

    const allowedKeys = [
      "term",
      "name",
      "internalCode",
      "targetType",
      "categoryId",
      "productId",
      "limit",
      "offset",
    ];

    const params = new URLSearchParams();
    allowedKeys.forEach((key) => {
      const value = filters?.[key];
      if (value === undefined || value === null) {
        return;
      }
      const normalized = String(value).trim();
      if (normalized !== "") {
        params.set(key, normalized);
      }
    });

    const queryString = params.toString();

    const requestUrl =
      `${this.baseUrl}/companies/` +
      `${encodeURIComponent(normalizedCompanyId)}/` +
      `trackings/search` +
      (queryString ? `?${queryString}` : "");

    const response = await fetch(requestUrl, {
      method: "GET",
      credentials: "include",
      headers: { Accept: "application/json" },
      signal,
    });

    const data = await readResponse(response);

    if (!response.ok) {
      throw new SearchTrackingServiceError(
        data?.message || `Error searching tracking: ${response.status}`,
        { status: response.status, response: data },
      );
    }

    return data;
  }

  /** Convenience helper: returns just the array of tracking headers. */
  async getTrackings(request = {}) {
    const response = await this.searchTracking(request);
    return response?.result || [];
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
