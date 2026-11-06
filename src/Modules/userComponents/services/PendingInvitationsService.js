import { APIUsers } from "../../../Shared/Utils/globalVar";

export default class PendingInvitationsService {
  constructor(baseUrl = APIUsers) {
    this.baseUrl = baseUrl;
  }

  async getPendingInvitations() {
    const response = await fetch(`${this.baseUrl}/invitations`, {
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
          `Error loading invitations. Status ${response.status}`
      );
    }

    return data || {};
  }
}