import { APIShao } from "../../../../Shared/Utils/globalVar";

export class CreateOrUpdateCompanyUserServiceError extends Error {
  constructor(
    message,
    { status, statusText, response, request, cause } = {},
  ) {
    super(message);

    this.name = "CreateOrUpdateCompanyUserServiceError";
    this.status = status;
    this.statusText = statusText;
    this.response = response;
    this.request = request;
    this.cause = cause;
  }
}

export default class CreateOrUpdateCompanyUserService {
  constructor(baseUrl = APIShao) {
    this.baseUrl = String(baseUrl || "").replace(/\/$/, "");
  }

  async createOrUpdateCompanyUser({
    companyId,
    companyUser,
    signal,
  } = {}) {
    const normalizedCompanyId = String(companyId || "").trim();

    if (!normalizedCompanyId) {
      throw new TypeError(
        "The selected company ID is required.",
      );
    }

    if (
      !companyUser ||
      typeof companyUser !== "object" ||
      Array.isArray(companyUser)
    ) {
      throw new TypeError(
        "The company user object is required.",
      );
    }

    const payload = {
      ...companyUser,
      companyId: normalizedCompanyId,
    };

    const requestUrl =
      `${this.baseUrl}/companies/` +
      `${encodeURIComponent(normalizedCompanyId)}` +
      "/company-users";

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
      logCompanyUserServiceError({
        title:
          "The request failed before receiving an HTTP response",
        request: requestDetails,
        cause,
      });

      throw new CreateOrUpdateCompanyUserServiceError(
        cause?.name === "AbortError"
          ? "The company-user request was cancelled."
          : "The server could not be reached while saving the company user.",
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
        new CreateOrUpdateCompanyUserServiceError(
          data?.message ||
            `Error saving company user: ${response.status}`,
          {
            status: response.status,
            statusText: response.statusText,
            response: data,
            request: requestDetails,
          },
        );

      logCompanyUserServiceError({
        title:
          "The backend rejected the company-user request",
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

function logCompanyUserServiceError({
  title,
  request,
  response,
  cause,
}) {
  console.group(
    `[CreateOrUpdateCompanyUserService] ${title}`,
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