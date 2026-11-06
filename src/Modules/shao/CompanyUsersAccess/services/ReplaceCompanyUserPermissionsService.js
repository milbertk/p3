import { APIShao } from "../../../../Shared/Utils/globalVar";

export class ReplaceCompanyUserPermissionsServiceError extends Error {
  constructor(
    message,
    { status, statusText, response, request, cause } = {},
  ) {
    super(message);

    this.name = "ReplaceCompanyUserPermissionsServiceError";
    this.status = status;
    this.statusText = statusText;
    this.response = response;
    this.request = request;
    this.cause = cause;
  }
}

export default class ReplaceCompanyUserPermissionsService {
  constructor(baseUrl = APIShao) {
    this.baseUrl = String(baseUrl || "").replace(/\/$/, "");
  }

  /**
   * Replaces the whole permission set for a company-user membership: the
   * backend deletes every existing permission and inserts the received list.
   *
   * Backend route:
   * POST /companies/{companyId}/company-users/permissions
   *
   * @param {string}   companyId       the selected company ID (URL).
   * @param {string}   companyUserId   the membership whose permissions change.
   * @param {string[]} permissionCodes permission keys to assign, e.g.
   *                                   ["NAV_HOME_ACCESS", "NAV_REPORTS_ACCESS"].
   *                                   Pass [] to remove all permissions.
   */
  async replaceCompanyUserPermissions({
    companyId,
    companyUserId,
    permissionCodes,
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

    if (!Array.isArray(permissionCodes)) {
      throw new TypeError(
        "permissionCodes must be an array (use [] to remove all).",
      );
    }

    // De-duplicate, trim, and drop empties. The backend also normalizes,
    // but sending clean data avoids avoidable 400s.
    const uniqueCodes = Array.from(
      new Set(
        permissionCodes
          .map((code) => String(code || "").trim())
          .filter(Boolean),
      ),
    );

    const payload = {
      companyUserId: normalizedCompanyUserId,
      // The backend expects an explicit array of permission objects.
      permissions: uniqueCodes.map((code) => ({
        permissionCode: code,
      })),
    };

    const requestUrl =
      `${this.baseUrl}/companies/` +
      `${encodeURIComponent(normalizedCompanyId)}` +
      `/company-users/permissions`;

    const requestDetails = {
      method: "POST",
      url: requestUrl,
      payload,
    };

    let response;

    try {
      response = await fetch(requestUrl, {
        method: "POST",
        credentials: "include",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
        signal,
      });
    } catch (cause) {
      logPermissionsServiceError({
        title:
          "The request failed before receiving an HTTP response",
        request: requestDetails,
        cause,
      });

      throw new ReplaceCompanyUserPermissionsServiceError(
        cause?.name === "AbortError"
          ? "The permissions request was cancelled."
          : "The server could not be reached while saving permissions.",
        {
          status: 0,
          statusText: "Network error",
          response: null,
          request: requestDetails,
          cause,
        },
      );
    }

    const data = await readResponse(response);

    if (!response.ok) {
      const serviceError =
        new ReplaceCompanyUserPermissionsServiceError(
          data?.message ||
            `Error saving permissions: ${response.status}`,
          {
            status: response.status,
            statusText: response.statusText,
            response: data,
            request: requestDetails,
          },
        );

      logPermissionsServiceError({
        title:
          "The backend rejected the permissions request",
        request: requestDetails,
        response: {
          status: response.status,
          statusText: response.statusText,
          body: data,
        },
        cause: serviceError,
      });

      throw serviceError;
    }

    return data;
  }
}

function logPermissionsServiceError({
  title,
  request,
  response,
  cause,
}) {
  console.group(
    `[ReplaceCompanyUserPermissionsService] ${title}`,
  );

  console.error("Request:", request);

  if (response) {
    console.error("Response:", response);
  }

  console.error("Error:", cause);
  console.groupEnd();
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