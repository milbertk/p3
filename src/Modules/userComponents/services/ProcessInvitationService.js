import { APIUsers } from "../../../Shared/Utils/globalVar";

export default class ProcessInvitationService {
  constructor(baseUrl = APIUsers) {
    this.baseUrl = baseUrl;
  }

  async processInvitation({ requestId, action, message = "" }) {
    const response = await fetch(`${this.baseUrl}/processrequestbyinvited`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        requestId,
        action,
        message,
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
          `Error processing invitation. Status ${response.status}`
      );
    }

    return data || {};
  }
}