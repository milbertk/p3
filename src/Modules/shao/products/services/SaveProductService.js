import { APIShao } from "../../../../Shared/Utils/globalVar";

export class SaveProductServiceError extends Error {
  constructor(
    message,
    { status, statusText, response, request, cause } = {},
  ) {
    super(message);

    this.name = "SaveProductServiceError";
    this.status = status;
    this.statusText = statusText;
    this.response = response;
    this.request = request;
    this.cause = cause;
  }
}

export default class SaveProductService {
  constructor(baseUrl = APIShao) {
    this.baseUrl = String(baseUrl || "").replace(/\/$/, "");
  }

  /**
   * Creates or updates a product.
   *
   * Backend route:
   * POST /companies/{companyId}/products
   *
   * If product.productInternalId is empty (or does not exist) the backend
   * creates a new record; otherwise it updates the provided fields.
   */
  async saveProduct({ companyId, product, signal } = {}) {
    const normalizedCompanyId = String(companyId || "").trim();

    if (!normalizedCompanyId) {
      throw new TypeError("The selected company ID is required.");
    }

    if (
      !product ||
      typeof product !== "object" ||
      Array.isArray(product)
    ) {
      throw new TypeError("The product object is required.");
    }

    const payload = { ...product };

    const requestUrl =
      `${this.baseUrl}/companies/` +
      `${encodeURIComponent(normalizedCompanyId)}` +
      "/products";

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
      logProductServiceError({
        title: "The request failed before receiving an HTTP response",
        request: requestDetails,
        cause,
      });

      throw new SaveProductServiceError(
        cause?.name === "AbortError"
          ? "The product request was cancelled."
          : "The server could not be reached while saving the product.",
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
      const serviceError = new SaveProductServiceError(
        data?.message || `Error saving product: ${response.status}`,
        {
          status: response.status,
          statusText: response.statusText,
          response: data,
          request: requestDetails,
        },
      );

      logProductServiceError({
        title: "The backend rejected the product request",
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

function logProductServiceError({ title, request, response, cause }) {
  console.group(`[SaveProductService] ${title}`);
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