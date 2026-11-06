import { APIShao } from "../../../../Shared/Utils/globalVar";

export class SaveCategoryServiceError extends Error {
  constructor(
    message,
    { status, statusText, response, request, cause } = {},
  ) {
    super(message);

    this.name = "SaveCategoryServiceError";
    this.status = status;
    this.statusText = statusText;
    this.response = response;
    this.request = request;
    this.cause = cause;
  }
}

export default class SaveCategoryService {
  constructor(baseUrl = APIShao) {
    this.baseUrl = String(baseUrl || "").replace(/\/$/, "");
  }

  /**
   * Creates or updates a category.
   *
   * Backend route:
   * POST /companies/{companyId}/categories
   *
   * If category.categoryInternalId is empty (or does not exist) the backend
   * creates a new record; otherwise it updates the provided fields.
   */
  async saveCategory({ companyId, category, signal } = {}) {
    const normalizedCompanyId = String(companyId || "").trim();

    if (!normalizedCompanyId) {
      throw new TypeError("The selected company ID is required.");
    }

    if (
      !category ||
      typeof category !== "object" ||
      Array.isArray(category)
    ) {
      throw new TypeError("The category object is required.");
    }

    const payload = { ...category };

    const requestUrl =
      `${this.baseUrl}/companies/` +
      `${encodeURIComponent(normalizedCompanyId)}` +
      "/categories";

    const requestDetails = { method: "POST", url: requestUrl, payload };

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
      logCategoryServiceError({
        title: "The request failed before receiving an HTTP response",
        request: requestDetails,
        cause,
      });

      throw new SaveCategoryServiceError(
        cause?.name === "AbortError"
          ? "The category request was cancelled."
          : "The server could not be reached while saving the category.",
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
      const serviceError = new SaveCategoryServiceError(
        data?.message || `Error saving category: ${response.status}`,
        {
          status: response.status,
          statusText: response.statusText,
          response: data,
          request: requestDetails,
        },
      );

      logCategoryServiceError({
        title: "The backend rejected the category request",
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

function logCategoryServiceError({ title, request, response, cause }) {
  console.group(`[SaveCategoryService] ${title}`);
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
    return { message: rawText };
  }
}
