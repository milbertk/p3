import { APIUsers } from "../../../Shared/Utils/globalVar";

export default class ChangeEmailService {
  constructor(baseUrl = APIUsers) {
    this.baseUrl = baseUrl;
  }

  async changeEmail({ currentEmail, newEmail, password }) {
    const response = await fetch(`${this.baseUrl}/changeemail`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        currentEmail,
        newEmail,
        password,
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
        data?.message || `Error changing email. Status ${response.status}`
      );
    }

    return data || {
      status: "OK",
      message: "Email updated successfully.",
      email: newEmail,
    };
  }
}