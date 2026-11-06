import { APIShao } from "../../../../Shared/Utils/globalVar";

export class SearchCategoriesServiceError extends Error {
  constructor(message, { status, response } = {}) {
    super(message);

    this.name = "SearchCategoriesServiceError";
    this.status = status;
    this.response = response;
  }
}

export default class SearchCategoriesService {
  constructor(baseUrl = APIShao) {
    this.baseUrl = String(baseUrl || "").replace(/\/$/, "");
  }

  /**
   * Searches categories using optional filters.
   *
   * Backend route:
   * GET /companies/{companyId}/categories/search?<filters>
   *
   * Supported filters (all optional): term, publishedCode, categoryName,
   * active, limit, offset. Only the provided ones are sent.
   */
  async searchCategories({ companyId, filters = {}, signal } = {}) {
    const normalizedCompanyId = String(companyId || "").trim();

    if (!normalizedCompanyId) {
      throw new TypeError("The selected company ID is required.");
    }

    const allowedKeys = [
      "term",
      "publishedCode",
      "categoryName",
      "active",
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
      `categories/search` +
      (queryString ? `?${queryString}` : "");

    const response = await fetch(requestUrl, {
      method: "GET",
      credentials: "include",
      headers: { Accept: "application/json" },
      signal,
    });

    const data = await readResponse(response);

    if (!response.ok) {
      throw new SearchCategoriesServiceError(
        data?.message || `Error searching categories: ${response.status}`,
        { status: response.status, response: data },
      );
    }

    return data;
  }

  /** Convenience helper: returns just the array of categories. */
  async getCategories(request = {}) {
    const response = await this.searchCategories(request);
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
