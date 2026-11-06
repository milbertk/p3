import { APIShao } from "../../../../Shared/Utils/globalVar";

export class SelectCompanyUserPermissionsServiceError extends Error {
  constructor(message, { status, response } = {}) {
    super(message);

    this.name = "SelectCompanyUserPermissionsServiceError";
    this.status = status;
    this.response = response;
  }
}

export default class SelectCompanyUserPermissionsService {
  constructor(baseUrl = APIShao) {
    this.baseUrl = String(baseUrl || "").replace(/\/$/, "");
  }

  /**
   * Reads the permissions currently assigned to a company-user membership.
   *
   * Backend route:
   * GET /companies/{companyId}/company-users/{companyUserId}/permissions
   *
   * Returns the raw backend payload:
   *   { status, message, result: { companyUserId, permissions: [...] } }
   */
  async selectCompanyUserPermissions({
    companyId,
    companyUserId,
    signal,
  } = {}) {
    const normalizedCompanyId = String(companyId || "").trim();
    const normalizedCompanyUserId = String(
      companyUserId || "",
    ).trim();

    if (!normalizedCompanyId) {
      throw new TypeError(
        "The selected company ID is required.",
      );
    }

    if (!normalizedCompanyUserId) {
      throw new TypeError(
        "The company user ID is required.",
      );
    }

    const requestUrl =
      `${this.baseUrl}/companies/` +
      `${encodeURIComponent(normalizedCompanyId)}/` +
      `company-users/` +
      `${encodeURIComponent(normalizedCompanyUserId)}/` +
      `permissions`;

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
      throw new SelectCompanyUserPermissionsServiceError(
        data?.message ||
          `Error reading company-user permissions: ${response.status}`,
        {
          status: response.status,
          response: data,
        },
      );
    }

    return data;
  }

  /**
   * Convenience helper: returns just the array of permission codes
   * (e.g. ["NAV_HOME_ACCESS", "NAV_REPORTS_ACCESS"]) for the membership.
   *
   * A 404 (membership not found) yields an empty list instead of throwing,
   * so a brand-new user simply starts with no permissions selected.
   */
  async getPermissionCodes(request = {}) {
    try {
      const response =
        await this.selectCompanyUserPermissions(request);

      const permissions =
        response?.result?.permissions || [];

      return permissions
        .map((permission) =>
          String(
            permission?.permissionCode || "",
          ).trim(),
        )
        .filter(Boolean);
    } catch (error) {
      if (
        error instanceof
          SelectCompanyUserPermissionsServiceError &&
        error.status === 404
      ) {
        return [];
      }

      throw error;
    }
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