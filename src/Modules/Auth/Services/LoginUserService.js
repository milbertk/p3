import { APIUsers } from "../../../Shared/Utils/globalVar";

export default class LoginUserService {
  constructor(baseUrl = APIUsers) {
    this.baseUrl = baseUrl;
  }

  /**
   * Logs in against the backend using a Firebase ID token.
   *
   * @param {string} firebaseToken - The Firebase ID token obtained via
   *                                 `userCredential.user.getIdToken()`.
   * @returns {Promise<{
   *   status: string,
   *   message: string,
   *   token: string,
   *   expires: string,
   *   uid: string,
   *   email: string
   * }>} - The backend's login response (also sets the access_token cookie).
   *
   * @throws {Error} If the network call fails, the backend returns non-2xx,
   *                 or the response body isn't valid JSON.
   */
  async login(firebaseToken) {
    if (!firebaseToken) {
      throw new Error("Missing Firebase token");
    }

    const url = `${this.baseUrl}/login`;

    const response = await fetch(url, {
      method: "POST",
      // include credentials so the access_token cookie set by the backend
      // is stored and sent on subsequent requests
      credentials: "include",
      headers: {
        Authorization: `Bearer ${firebaseToken}`,
        "Content-Type": "application/json",
      },
    });

    // Read as text first so we can surface non-JSON responses cleanly
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
          `Login request failed with status ${response.status}`
      );
    }

    return data;
  }
}