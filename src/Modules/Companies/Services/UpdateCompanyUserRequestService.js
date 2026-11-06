import { APIUsers } from "../../../Shared/Utils/globalVar";

export default class UpdateCompanyUserRequestService {
  constructor(baseUrl = APIUsers) {
    this.baseUrl = baseUrl;
  }

  async cancelRequest(requestId) {
    const response = await fetch(`${this.baseUrl}/cancelrequest`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        requestId,
        status: "CANCELED",
      }),
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
          `Cancel request failed with status ${response.status}`
      );
    }

    return data || {};
  }
}