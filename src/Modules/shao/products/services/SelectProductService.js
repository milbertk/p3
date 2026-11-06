import { APIShao } from "../../../../Shared/Utils/globalVar";

export class SelectProductServiceError extends Error {
  constructor(message, { status, response } = {}) {
    super(message);

    this.name = "SelectProductServiceError";
    this.status = status;
    this.response = response;
  }
}

export default class SelectProductService {
  constructor(baseUrl = APIShao) {
    this.baseUrl = String(baseUrl || "").replace(/\/$/, "");
  }

  /**
   * Selects one product by its internal id (product_internal_id UUID).
   *
   * Backend route:
   * GET /companies/{companyId}/products/{productInternalId}
   */
  async selectProductByInternalId({
    companyId,
    productInternalId,
    signal,
  } = {}) {
    const normalizedCompanyId = String(companyId || "").trim();
    const normalizedInternalId = String(productInternalId || "").trim();

    if (!normalizedCompanyId) {
      throw new TypeError("The selected company ID is required.");
    }

    if (!normalizedInternalId) {
      throw new TypeError("The product internal ID is required.");
    }

    const requestUrl =
      `${this.baseUrl}/companies/` +
      `${encodeURIComponent(normalizedCompanyId)}/` +
      `products/` +
      `${encodeURIComponent(normalizedInternalId)}`;

    const response = await fetch(requestUrl, {
      method: "GET",
      credentials: "include",
      headers: { Accept: "application/json" },
      signal,
    });

    const data = await readResponse(response);

    if (!response.ok) {
      throw new SelectProductServiceError(
        data?.message || `Error selecting product: ${response.status}`,
        { status: response.status, response: data },
      );
    }

    return data;
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
    return { message: rawText };
  }
}