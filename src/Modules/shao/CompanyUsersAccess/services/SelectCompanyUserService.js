import { APIShao } from "../../../../Shared/Utils/globalVar";

export class SelectCompanyUserServiceError extends Error {
  constructor(message, { status, response } = {}) {
    super(message);

    this.name = "SelectCompanyUserServiceError";
    this.status = status;
    this.response = response;
  }
}

export default class SelectCompanyUserService {
  constructor(baseUrl = APIShao) {
    this.baseUrl = String(baseUrl || "").replace(/\/$/, "");
  }

  /**
   * Selects a company user by companyUserId.
   *
   * Backend route:
   * GET /companies/{companyId}/company-users/{companyUserId}
   */
  async selectCompanyUser({
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
      `${encodeURIComponent(normalizedCompanyUserId)}`;

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
      throw new SelectCompanyUserServiceError(
        data?.message ||
          `Error selecting company user: ${response.status}`,
        {
          status: response.status,
          response: data,
        },
      );
    }

    return data;
  }

  /**
   * Checks whether the company-user membership already exists.
   *
   * A 404 response means that the membership has not been found.
   * Authentication, permission and server errors are still thrown.
   */
  async companyUserExists(request = {}) {
    try {
      const response =
        await this.selectCompanyUser(request);

      return {
        exists: Boolean(response?.result),
        result: response?.result || null,
        response,
      };
    } catch (error) {
      if (
        error instanceof SelectCompanyUserServiceError &&
        error.status === 404
      ) {
        return {
          exists: false,
          result: null,
          response: error.response || null,
        };
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