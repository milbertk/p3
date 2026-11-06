import { APIUsers } from "../../../Shared/Utils/globalVar";

export default class SearchUsersService {
  constructor(baseUrl = APIUsers) {
    this.baseUrl = baseUrl;
  }

  // Exact email of the user + the company that invites (2026-10-25,
  // security S10): only the OWNER / MANAGER of companyId can search, and the
  // server returns at most one user (no partial text, no lists).
  async searchUsers(search = "", companyId = "") {
    const params = new URLSearchParams();

    if (search?.trim()) {
      params.set("search", search.trim());
    }
    if (String(companyId || "").trim()) {
      params.set("companyId", String(companyId).trim());
    }

    const queryString = params.toString();

    const url = queryString
      ? `${this.baseUrl}/searchUser?${queryString}`
      : `${this.baseUrl}/searchUser`;

    const response = await fetch(url, {
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
        // Plain-text answers (e.g. 403 "User is not authorized for this company").
        data = { message: rawText.trim().slice(0, 200) };
      }
    }

    if (!response.ok) {
      throw new Error(
        data?.message || `User search failed with status ${response.status}`
      );
    }

    return (
      data || {
        status: "OK",
        message: "Users retrieved successfully.",
        users: [],
      }
    );
  }
}