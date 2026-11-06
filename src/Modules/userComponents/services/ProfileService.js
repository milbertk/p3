import { APIUsers } from "../../../Shared/Utils/globalVar";

export default class ProfileService {
  constructor(baseUrl = APIUsers) {
    this.baseUrl = baseUrl;
  }

  async getProfile() {
    const response = await fetch(`${this.baseUrl}/getuserinfo`, {
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
        data?.message || `Error loading profile. Status ${response.status}`
      );
    }

    return data || {};
  }

  async updateProfile(profileData) {
    const response = await fetch(`${this.baseUrl}/profile`, {
      method: "PUT",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(profileData),
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
        data?.message || `Error updating profile. Status ${response.status}`
      );
    }

    return data || {};
  }
}