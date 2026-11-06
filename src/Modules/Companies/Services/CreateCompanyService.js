import { APIUsers } from "../../../Shared/Utils/globalVar";

export default class CreateCompanyService {
  constructor(baseUrl = APIUsers) {
    this.baseUrl = baseUrl;
  }

  async createOrUpdateCompany(companyData) {
    if (!companyData) {
      throw new Error("Company data is required");
    }

    const response = await fetch(`${this.baseUrl}/companiescreate`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(companyData),
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
        data?.message || `Company request failed with status ${response.status}`
      );
    }

    return data || {
      status: "OK",
      message: "Company saved successfully.",
    };
  }
}