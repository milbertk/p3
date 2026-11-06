import { APIUsers } from "../../../Shared/Utils/globalVar";

export default class LogoutService {
  constructor(baseUrl = APIUsers) {
    this.baseUrl = baseUrl;
  }

  /**
   * Logs out the current user.
   * The backend should remove the HttpOnly cookie.
   *
   * @returns {Promise<{
   *   status?: string,
   *   message?: string
   * }>}
   *
   * @throws {Error} If the network call fails, the backend returns non-2xx,
   *                 or the response body is invalid JSON.
   */
  async logout() {
    const url = `${this.baseUrl}/logout`;

    const response = await fetch(url, {
      method: "POST",
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
          `Logout request failed with status ${response.status}`
      );
    }

    return data;
  }
}