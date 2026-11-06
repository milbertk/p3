import { APIShao } from "../../../../Shared/Utils/globalVar";

export class SearchWebOrdersServiceError extends Error {
  constructor(message, { status, response } = {}) {
    super(message);
    this.name = "SearchWebOrdersServiceError";
    this.status = status;
    this.response = response;
  }
}

export default class SearchWebOrdersService {
  constructor(baseUrl = APIShao) {
    this.baseUrl = String(baseUrl || "").replace(/\/$/, "");
  }

  /**
   * Lists web order requests for the approval screen.
   *
   * Backend route (authenticated):
   * GET /companies/{companyId}/web-orders/search?<filters>
   *
   * Filters: term, status, region, orderType, requesterType, dateFrom, dateTo,
   * limit, offset.
   */
  async searchWebOrders({ companyId, filters = {}, signal } = {}) {
    const c = String(companyId || "").trim();
    if (!c) throw new TypeError("The company ID is required.");

    const allowed = [
      "term", "status", "region", "orderType", "requesterType",
      "dateFrom", "dateTo", "limit", "offset",
    ];
    const params = new URLSearchParams();
    allowed.forEach((k) => {
      const v = filters?.[k];
      if (v === undefined || v === null) return;
      const s = String(v).trim();
      if (s !== "") params.set(k, s);
    });
    const qs = params.toString();

    const url =
      `${this.baseUrl}/companies/${encodeURIComponent(c)}/web-orders/search` +
      (qs ? `?${qs}` : "");

    const response = await fetch(url, {
      method: "GET",
      credentials: "include",
      headers: { Accept: "application/json" },
      signal,
    });

    const data = await readJson(response);
    if (!response.ok) {
      throw new SearchWebOrdersServiceError(
        data?.message || `Error searching web orders: ${response.status}`,
        { status: response.status, response: data },
      );
    }
    return data;
  }

  async getWebOrders(request = {}) {
    const response = await this.searchWebOrders(request);
    return response?.result || [];
  }
}

async function readJson(response) {
  const text = await response.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return { message: text };
  }
}
