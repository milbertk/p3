import { APIShao } from "../../../../Shared/Utils/globalVar";

export class SearchProductsServiceError extends Error {
  constructor(message, { status, response } = {}) {
    super(message);

    this.name = "SearchProductsServiceError";
    this.status = status;
    this.response = response;
  }
}

export default class SearchProductsService {
  constructor(baseUrl = APIShao) {
    this.baseUrl = String(baseUrl || "").replace(/\/$/, "");
  }

  /**
   * Searches products using optional filters.
   *
   * Backend route:
   * GET /companies/{companyId}/products/search?<filters>
   *
   * Supported filters (all optional): term, productCode, name, categoryId,
   * productType, status, limit, offset. Only the provided ones are sent.
   */
  async searchProducts({ companyId, filters = {}, signal } = {}) {
    const normalizedCompanyId = String(companyId || "").trim();

    if (!normalizedCompanyId) {
      throw new TypeError("The selected company ID is required.");
    }

    const allowedKeys = [
      "term",
      "productCode",
      "name",
      "categoryId",
      "productType",
      "status",
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
      `products/search` +
      (queryString ? `?${queryString}` : "");

    const response = await fetch(requestUrl, {
      method: "GET",
      credentials: "include",
      headers: { Accept: "application/json" },
      signal,
    });

    const data = await readResponse(response);

    if (!response.ok) {
      throw new SearchProductsServiceError(
        data?.message || `Error searching products: ${response.status}`,
        { status: response.status, response: data },
      );
    }

    return data;
  }

  /** Convenience helper: returns just the array of products. */
  async getProducts(request = {}) {
    const response = await this.searchProducts(request);
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