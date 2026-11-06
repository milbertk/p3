import { APIUsers } from "../../../Shared/Utils/globalVar";

export default class UpdateCompanyUserService {
  constructor(baseUrl = APIUsers) {
    this.baseUrl = baseUrl;
  }

  async updateCompanyUser(payload) {
    const response = await fetch(`${this.baseUrl}/updateuserofcompany`, {
      method: "PUT",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const rawText = await response.text();
    const data = rawText ? JSON.parse(rawText) : null;

    if (!response.ok) {
      throw new Error(data?.message || `Error updating company user: ${response.status}`);
    }

    return data || {};
  }
}