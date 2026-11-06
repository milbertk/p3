import { APIUsers } from "../../../Shared/Utils/globalVar";

export default class SendInvitationService {
  constructor(baseUrl = APIUsers) {
    this.baseUrl = baseUrl;
  }

  async sendInvitation(targetEmail, message) {
    if (!targetEmail) {
      throw new Error("Target email is required");
    }

    const response = await fetch(
      `${this.baseUrl}/sendinvitation`,
      {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          targetEmail,
          message,
        }),
      }
    );

    const rawText = await response.text();

    let data = null;

    if (rawText) {
      try {
        data = JSON.parse(rawText);
      } catch (parseErr) {
        throw new Error(
          `Invalid JSON from server (status ${response.status}). ` +
            `First 200 chars: ${rawText.slice(0, 200)}`
        );
      }
    }

    if (!response.ok) {
      throw new Error(
        data?.message ||
          `Send invitation failed with status ${response.status}`
      );
    }

    return data;
  }
}