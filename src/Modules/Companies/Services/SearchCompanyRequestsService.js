import { APIUsers } from "../../../Shared/Utils/globalVar";

export default class SearchCompanyRequestsService {
  constructor(baseUrl = APIUsers) {
    this.baseUrl = baseUrl;
  }

  async searchRequests({
    companyId,
    search = "",
    page = 1,
    pageSize = 5,
  } = {}) {
    const params = new URLSearchParams();

    if (companyId) params.set("companyId", companyId);
    if (search?.trim()) params.set("search", search.trim());

    params.set("page", String(page));
    params.set("pageSize", String(pageSize));

    const url = `${this.baseUrl}/searchRequest?${params.toString()}`;

    const response = await fetch(url, {
      method: "GET",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
    });

    const rawText = await response.text();
    let data = null;

    if (rawText) {
      try {
        data = JSON.parse(rawText);
      } catch {
        throw new Error(
          `Invalid JSON from server. Status ${response.status}. First 200 chars: ${rawText.slice(
            0,
            200
          )}`
        );
      }
    }

    if (!response.ok) {
      throw new Error(
        data?.message ||
          `Search requests failed with status ${response.status}`
      );
    }

    return data || {};
  }
}