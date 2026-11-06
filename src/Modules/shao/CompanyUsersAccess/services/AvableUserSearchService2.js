import { APIUsers } from "../../../../Shared/Utils/globalVar";

const getUsersFromResponse = (data) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.result)) return data.result;
  if (Array.isArray(data?.users)) return data.users;

  return [];
};

export default class AvableUserSearchService2 {
  constructor(baseUrl = APIUsers) {
    this.baseUrl = String(baseUrl || "").replace(/\/$/, "");
  }

  async searchUsers({
    companyId,
    includeInactive = true,
    signal,
  } = {}) {
    const params = new URLSearchParams();

    if (companyId) {
      params.set("companyId", companyId);
    }

    params.set("includeInactive", String(includeInactive));

    const response = await fetch(
      `${this.baseUrl}/searchuserbycompany?${params.toString()}`,
      {
        method: "GET",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        signal,
      },
    );

    const rawText = await response.text();
    let data = null;

    if (rawText) {
      try {
        data = JSON.parse(rawText);
      } catch {
        data = null;
      }
    }

    if (!response.ok) {
      throw new Error(
        data?.message ||
          `Error loading company users: ${response.status}`,
      );
    }

    const responseData =
      data && typeof data === "object" && !Array.isArray(data)
        ? data
        : {};

    return {
      ...responseData,
      result: getUsersFromResponse(data),
    };
  }
}