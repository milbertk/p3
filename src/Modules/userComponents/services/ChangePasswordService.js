import { APIUsers } from "../../../Shared/Utils/globalVar";

export default class ChangePasswordService {
  constructor(baseUrl = APIUsers) {
    this.baseUrl = baseUrl;
  }

  async changePassword({ currentPassword, newPassword, confirmPassword }) {
    const response = await fetch(`${this.baseUrl}/changepassword`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        currentPassword,
        newPassword,
        confirmPassword,
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
        data?.message || `Error changing password. Status ${response.status}`
      );
    }

    return data || {};
  }
}