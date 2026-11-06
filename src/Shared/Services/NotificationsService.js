import { APIUsers } from "../Utils/globalVar";


export default class NotificationsService {
  constructor(baseUrl = APIUsers) {
    this.baseUrl = baseUrl;
  }

  async getNotifications() {
    const response = await fetch(`${this.baseUrl}/notifications`, {
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
          `Error loading notifications. Status ${response.status}`
      );
    }

    return data || {
      status: "OK",
      message: "No content",
      notifications: [],
    };
  }
}