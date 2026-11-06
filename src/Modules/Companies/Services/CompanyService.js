// Same API address as the rest of the app (2026-10-31): REACT_APP_API_USERS via globalVar.
import { APIUsers } from "../../../Shared/Utils/globalVar";

const jsonHeaders = {
  "Content-Type": "application/json",
};

const CompanyService = {
  async createOrUpdateCompany(company) {
    const response = await fetch(`${APIUsers}/companiescreate`, {
      method: "POST",
      headers: jsonHeaders,
      credentials: "include",
      body: JSON.stringify(company),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.message || "Error saving company");
    }

    return data;
  },

  async getCompanies() {
    const response = await fetch(`${APIUsers}/companiesget`, {
      method: "GET",
      headers: jsonHeaders,
      credentials: "include",
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.message || "Error loading companies");
    }

    return data;
  },
};

export default CompanyService;