import { APIUsers } from "../Utils/globalVar";


export default class MyCompaniesService {
  constructor(baseUrl = APIUsers) {
    this.baseUrl = baseUrl;
  }

  async getMyCompanies() {
    const response = await fetch(`${this.baseUrl}/companiesmy`, {
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
          `My companies request failed with status ${response.status}`
      );
    }

    return data || {
      status: "OK",
      message: "Companies retrieved successfully.",
      companies: [],
    };
  }
}