import { APIUsers } from "../../../Shared/Utils/globalVar";

export default class CompanyGetService {
  constructor(baseUrl = APIUsers) {
    this.baseUrl = baseUrl;
  }

  async getCompanies({
    search = "",
    status = "",
    plan = "",
    includeInactive = true,
  } = {}) {
    const params = new URLSearchParams();

    if (search?.trim()) {
      params.set("search", search.trim());
    }

    if (status?.trim()) {
      params.set("status", status.trim());
    }

    if (plan?.trim()) {
      params.set("plan", plan.trim());
    }

    if (includeInactive) {
      params.set("includeInactive", "true");
    }

    const queryString = params.toString();

    const url = queryString
      ? `${this.baseUrl}/companiesget?${queryString}`
      : `${this.baseUrl}/companiesget`;

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
          `Invalid JSON from server. Status ${response.status}. ` +
            `First 200 chars: ${rawText.slice(0, 200)}`
        );
      }
    }

    if (!response.ok) {
      throw new Error(
        data?.message || `Companies request failed with status ${response.status}`
      );
    }

    return data || {
      status: "OK",
      message: "Companies retrieved successfully.",
      companies: [],
    };
  }
}