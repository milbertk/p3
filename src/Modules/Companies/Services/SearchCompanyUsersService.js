import { APIUsers } from "../../../Shared/Utils/globalVar";

export default class SearchCompanyUsersService {
  constructor(baseUrl = APIUsers) {
    this.baseUrl = baseUrl;
  }

  async searchCompanyUsers({ companyId, includeInactive = true } = {}) {
    const params = new URLSearchParams();

    if (companyId) {
      params.set("companyId", companyId);
    }

    params.set("includeInactive", String(includeInactive));

    const response = await fetch(
      `${this.baseUrl}/searchuserbycompany?${params.toString()}`,
      {
        method: "GET",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    const rawText = await response.text();
    const data = rawText ? JSON.parse(rawText) : null;

    if (!response.ok) {
      throw new Error(data?.message || `Error loading company users: ${response.status}`);
    }

    return data || {};
  }
}