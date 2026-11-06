import { APIShao } from "../../../../Shared/Utils/globalVar";

export class SelectCategoryServiceError extends Error {
  constructor(message, { status, response } = {}) {
    super(message);

    this.name = "SelectCategoryServiceError";
    this.status = status;
    this.response = response;
  }
}

export default class SelectCategoryService {
  constructor(baseUrl = APIShao) {
    this.baseUrl = String(baseUrl || "").replace(/\/$/, "");
  }

  /**
   * Selects one category by its internal id (category_id UUID).
   *
   * Backend route:
   * GET /companies/{companyId}/categories/{categoryInternalId}
   */
  async selectCategoryByInternalId({
    companyId,
    categoryInternalId,
    signal,
  } = {}) {
    const normalizedCompanyId = String(companyId || "").trim();
    const normalizedInternalId = String(categoryInternalId || "").trim();

    if (!normalizedCompanyId) {
      throw new TypeError("The selected company ID is required.");
    }

    if (!normalizedInternalId) {
      throw new TypeError("The category internal ID is required.");
    }

    const requestUrl =
      `${this.baseUrl}/companies/` +
      `${encodeURIComponent(normalizedCompanyId)}/` +
      `categories/` +
      `${encodeURIComponent(normalizedInternalId)}`;

    const response = await fetch(requestUrl, {
      method: "GET",
      credentials: "include",
      headers: { Accept: "application/json" },
      signal,
    });

    const data = await readResponse(response);

    if (!response.ok) {
      throw new SelectCategoryServiceError(
        data?.message || `Error selecting category: ${response.status}`,
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
