import { APIShao } from "../../../../Shared/Utils/globalVar";

export class SaveCustomerServiceError extends Error {
  constructor(
    message,
    { status, statusText, response, request, cause } = {},
  ) {
    super(message);

    this.name = "SaveCustomerServiceError";
    this.status = status;
    this.statusText = statusText;
    this.response = response;
    this.request = request;
    this.cause = cause;
  }
}

export default class SaveCustomerService {
  constructor(baseUrl = APIShao) {
    this.baseUrl = String(baseUrl || "").replace(/\/$/, "");
  }

  /**
   * Creates or updates a customer.
   *
   * Backend route:
   * POST /companies/{companyId}/customers
   *
   * If customer.customerInternalId is empty (or does not exist) the backend
   * creates a new record; otherwise it updates the provided fields.
   */
  async saveCustomer({ companyId, customer, signal } = {}) {
    const normalizedCompanyId = String(companyId || "").trim();

    if (!normalizedCompanyId) {
      throw new TypeError(
        "The selected company ID is required.",
      );
    }

    if (
      !customer ||
      typeof customer !== "object" ||
      Array.isArray(customer)
    ) {
      throw new TypeError(
        "The customer object is required.",
      );
    }

    const payload = { ...customer };

    const requestUrl =
      `${this.baseUrl}/companies/` +
      `${encodeURIComponent(normalizedCompanyId)}` +
      "/customers";

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
      logCustomerServiceError({
        title:
          "The request failed before receiving an HTTP response",
        request: requestDetails,
        cause,
      });

      throw new SaveCustomerServiceError(
        cause?.name === "AbortError"
          ? "The customer request was cancelled."
          : "The server could not be reached while saving the customer.",
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
      const serviceError = new SaveCustomerServiceError(
        data?.message ||
          `Error saving customer: ${response.status}`,
        {
          status: response.status,
          statusText: response.statusText,
          response: data,
          request: requestDetails,
        },
      );

      logCustomerServiceError({
        title: "The backend rejected the customer request",
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

function logCustomerServiceError({
  title,
  request,
  response,
  cause,
}) {
  console.group(`[SaveCustomerService] ${title}`);

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
