import { APIUsers } from "../../../Shared/Utils/globalVar";

export default class CompanyUserRequestService {
  constructor(baseUrl = APIUsers) {
    this.baseUrl = baseUrl;
  }

  async createCompanyUserRequest({
    companyId,
    invitedUserId,
    roleRequested = "USER",
    message = "",
    status = "PENDING",
  }) {
    const payload = {
      companyId,
      invitedUserId,
      roleRequested,
      message,
      status,
    };

    const response = await fetch(`${this.baseUrl}/userRequestCreate`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
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
          `Company user request failed with status ${response.status}`
      );
    }

    return data || {
      status: "OK",
      message: "Company user request created successfully.",
    };
  }
}