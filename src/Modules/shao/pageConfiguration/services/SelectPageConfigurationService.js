import { APIShao } from "../../../../Shared/Utils/globalVar";

export class SelectPageConfigurationServiceError extends Error {
  constructor(message, { status, response } = {}) {
    super(message);

    this.name = "SelectPageConfigurationServiceError";
    this.status = status;
    this.response = response;
  }
}

export default class SelectPageConfigurationService {
  constructor(baseUrl = APIShao) {
    this.baseUrl = String(baseUrl || "").replace(/\/$/, "");
  }

  /**
   * Loads the page configuration of the selected company.
   *
   * Backend route:
   * GET /companies/{companyId}/page-configuration
   *
   * Resolves to the configuration object, or null when the company has not
   * configured its page yet.
   */
  async selectPageConfiguration({ companyId, signal } = {}) {
    const normalizedCompanyId = String(companyId || "").trim();

    if (!normalizedCompanyId) {
      throw new TypeError("The selected company ID is required.");
    }

    const requestUrl =
      `${this.baseUrl}/companies/` +
      `${encodeURIComponent(normalizedCompanyId)}` +
      "/page-configuration";

    const response = await fetch(requestUrl, {
      method: "GET",
      credentials: "include",
      headers: { Accept: "application/json" },
      signal,
    });

    const data = await readResponse(response);

    if (!response.ok) {
      throw new SelectPageConfigurationServiceError(
        data?.message || `Error loading page configuration: ${response.status}`,
        { status: response.status, response: data },
      );
    }

    return data?.result || null;
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
