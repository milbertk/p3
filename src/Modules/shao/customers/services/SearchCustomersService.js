import { APIShao } from "../../../../Shared/Utils/globalVar";

export class SearchCustomersServiceError extends Error {
  constructor(message, { status, response } = {}) {
    super(message);

    this.name = "SearchCustomersServiceError";
    this.status = status;
    this.response = response;
  }
}

export default class SearchCustomersService {
  constructor(baseUrl = APIShao) {
    this.baseUrl = String(baseUrl || "").replace(/\/$/, "");
  }

  /**
   * Searches customers using optional filters.
   *
   * Backend route:
   * GET /companies/{companyId}/customers/search?<filters>
   *
   * Supported filters (all optional): term, customerId, name, alias, email,
   * cellphone, socialNetworkLink, socialNetwork, status, category, limit,
   * offset. Only the provided ones are sent.
   */
  async searchCustomers({ companyId, filters = {}, signal } = {}) {
    const normalizedCompanyId = String(companyId || "").trim();

    if (!normalizedCompanyId) {
      throw new TypeError(
        "The selected company ID is required.",
      );
    }

    const allowedKeys = [
      "term",
      "customerId",
      "name",
      "alias",
      "email",
      "cellphone",
      "socialNetworkLink",
      "socialNetwork",
      "status",
      "category",
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
      `customers/search` +
      (queryString ? `?${queryString}` : "");

    const response = await fetch(requestUrl, {
      method: "GET",
      credentials: "include",
      headers: {
        Accept: "application/json",
      },
      signal,
    });

    const data = await readResponse(response);

    if (!response.ok) {
      throw new SearchCustomersServiceError(
        data?.message ||
          `Error searching customers: ${response.status}`,
        {
          status: response.status,
          response: data,
        },
      );
    }

    return data;
  }

  /**
   * Convenience helper: returns just the array of customers from the response.
   */
  async getCustomers(request = {}) {
    const response = await this.searchCustomers(request);
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
    return {
      message: rawText,
    };
  }
}
