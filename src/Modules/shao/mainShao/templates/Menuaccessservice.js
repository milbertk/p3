import { APIShao } from "../../../../Shared/Utils/globalVar";

export class MenuAccessServiceError extends Error {
  constructor(message, { status, response } = {}) {
    super(message);

    this.name = "MenuAccessServiceError";
    this.status = status;
    this.response = response;
  }
}

export default class MenuAccessService {
  constructor(baseUrl = APIShao) {
    this.baseUrl = String(baseUrl || "").replace(/\/$/, "");
  }

  /**
   * Returns the current user's access for a company: their role and the list
   * of navigation permission codes (NAV_*) they hold.
   *
   * Expected backend route (resolves the user from the JWT + companyId):
   *   GET /companies/{companyId}/my-access
   *
   * Expected payload (either shape works):
   *   { result: { role: "MANAGER", permissions: ["NAV_HOME_ACCESS", ...] } }
   *   { role: "MANAGER", permissions: [{ permissionCode: "NAV_HOME_ACCESS" }] }
   *
   * @returns {Promise<{ role: string, permissions: string[] }>}
   */
  async getMyMenuAccess({ companyId, signal } = {}) {
    const normalizedCompanyId = String(companyId || "").trim();

    if (!normalizedCompanyId) {
      throw new TypeError(
        "The selected company ID is required.",
      );
    }

    const requestUrl =
      `${this.baseUrl}/companies/` +
      `${encodeURIComponent(normalizedCompanyId)}/` +
      `my-access`;

    const response = await fetch(requestUrl, {
      method: "GET",
      credentials: "include",
      headers: {
        Accept: "application/json",
      },
      signal,
    });

    const data = await readResponse(response);

    if (!response.ok) {
      throw new MenuAccessServiceError(
        data?.message ||
          `Error reading menu access: ${response.status}`,
        {
          status: response.status,
          response: data,
        },
      );
    }

    const result = data?.result || data || {};

    const role = String(result.role || "")
      .trim()
      .toUpperCase();

    // Accept permissions as ["NAV_..."] or [{ permissionCode: "NAV_..." }].
    const rawPermissions = Array.isArray(
      result.permissions,
    )
      ? result.permissions
      : [];

    const permissions = rawPermissions
      .map((permission) =>
        typeof permission === "string"
          ? permission.trim()
          : String(
              permission?.permissionCode || "",
            ).trim(),
      )
      .filter(Boolean);

    return { role, permissions };
  }
}

async function readResponse(response) {
  const rawText = await response.text();

  if (!rawText) {
    return {};
  }

  try {
    return JSON.parse(rawText);
  } catch {
    return {
      message: rawText,
    };
  }
}