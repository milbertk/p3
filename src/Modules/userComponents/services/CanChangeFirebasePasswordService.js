import { APIUsers } from "../../../Shared/Utils/globalVar";

export default class CanChangeFirebasePasswordService {
  constructor(baseUrl = APIUsers) {
    this.baseUrl = baseUrl;
  }

  async canChangePassword() {
    const response = await fetch(`${this.baseUrl}/canchangefirebasepassword`, {
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
          `Error validating password change availability. Status ${response.status}`
      );
    }

    return (
      data || {
        status: "OK",
        message: "No content",
        canChange: false,
        providers: [],
        providerType: "unknown",
      }
    );
  }
}