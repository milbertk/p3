import { APIShao } from "../../../../Shared/Utils/globalVar";

export class ShowcaseServiceError extends Error {
  constructor(message, { status, response } = {}) {
    super(message);
    this.name = "ShowcaseServiceError";
    this.status = status;
    this.response = response;
  }
}

export default class ShowcaseService {
  constructor(baseUrl = APIShao) {
    this.baseUrl = String(baseUrl || "").replace(/\/$/, "");
  }

  /**
   * Loads the PUBLIC showcase of a company (web-available, active products).
   *
   * Backend route (unauthenticated, read-only):
   * GET /public/companies/{companyId}/showcase?<filters>
   *
   * Supported filters (all optional): term, category, productType, id, limit,
   * offset. Only the provided ones are sent.
   *
   * Note: this is a PUBLIC endpoint, so it does NOT send credentials.
   */
  async getShowcase({ companyId, filters = {}, signal } = {}) {
    const normalizedCompanyId = String(companyId || "").trim();
    if (!normalizedCompanyId) {
      throw new TypeError("The company ID is required.");
    }

    const allowedKeys = ["term", "category", "productType", "id", "limit", "offset"];
    const params = new URLSearchParams();
    allowedKeys.forEach((key) => {
      const value = filters?.[key];
      if (value === undefined || value === null) return;
      const normalized = String(value).trim();
      if (normalized !== "") params.set(key, normalized);
    });

    const queryString = params.toString();

    const requestUrl =
      `${this.baseUrl}/public/companies/` +
      `${encodeURIComponent(normalizedCompanyId)}/` +
      `showcase` +
      (queryString ? `?${queryString}` : "");

    const response = await fetch(requestUrl, {
      method: "GET",
      // Public endpoint: no cookies/credentials needed.
      headers: { Accept: "application/json" },
      signal,
    });

    const data = await readResponse(response);

    if (!response.ok) {
      throw new ShowcaseServiceError(
        data?.message || `Error loading showcase: ${response.status}`,
        { status: response.status, response: data },
      );
    }

    return data;
  }

  /** Convenience helper: returns just the array of showcase items. */
  async getShowcaseItems(request = {}) {
    const response = await this.getShowcase(request);
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
