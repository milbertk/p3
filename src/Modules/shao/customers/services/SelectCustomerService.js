import { APIShao } from "../../../../Shared/Utils/globalVar";

export class SelectCustomerServiceError extends Error {
  constructor(message, { status, response } = {}) {
    super(message);

    this.name = "SelectCustomerServiceError";
    this.status = status;
    this.response = response;
  }
}

export default class SelectCustomerService {
  constructor(baseUrl = APIShao) {
    this.baseUrl = String(baseUrl || "").replace(/\/$/, "");
  }

  /**
   * Selects one customer by its primary key (customer_internal_id).
   *
   * Backend route:
   * GET /companies/{companyId}/customers/{customerInternalId}
   */
  async selectCustomerByInternalId({
    companyId,
    customerInternalId,
    signal,
  } = {}) {
    const normalizedCompanyId = String(companyId || "").trim();
    const normalizedInternalId = String(
      customerInternalId || "",
    ).trim();

    if (!normalizedCompanyId) {
      throw new TypeError(
        "The selected company ID is required.",
      );
    }

    if (!normalizedInternalId) {
      throw new TypeError(
        "The customer internal ID is required.",
      );
    }

    const requestUrl =
      `${this.baseUrl}/companies/` +
      `${encodeURIComponent(normalizedCompanyId)}/` +
      `customers/` +
      `${encodeURIComponent(normalizedInternalId)}`;

    return this.#getCustomer(requestUrl, signal);
  }

  /**
   * Selects one customer by a single field, using the lookup endpoint.
   *
   * Backend route:
   * GET /companies/{companyId}/customers/lookup?<field>=<value>
   *
   * Provide exactly ONE of: customerId, email, phone, socialNetworkLink.
   */
  async lookupCustomer({
    companyId,
    customerId,
    email,
    phone,
    socialNetworkLink,
    signal,
  } = {}) {
    const normalizedCompanyId = String(companyId || "").trim();

    if (!normalizedCompanyId) {
      throw new TypeError(
        "The selected company ID is required.",
      );
    }

    const params = new URLSearchParams();

    if (String(customerId || "").trim()) {
      params.set("customerId", String(customerId).trim());
    } else if (String(email || "").trim()) {
      params.set("email", String(email).trim());
    } else if (String(phone || "").trim()) {
      params.set("phone", String(phone).trim());
    } else if (String(socialNetworkLink || "").trim()) {
      params.set(
        "socialNetworkLink",
        String(socialNetworkLink).trim(),
      );
    } else {
      throw new TypeError(
        "Provide one lookup value: customerId, email, phone or socialNetworkLink.",
      );
    }

    const requestUrl =
      `${this.baseUrl}/companies/` +
      `${encodeURIComponent(normalizedCompanyId)}/` +
      `customers/lookup?${params.toString()}`;

    return this.#getCustomer(requestUrl, signal);
  }

  /**
   * Like selectCustomerByInternalId, but a 404 (not found) returns null instead
   * of throwing, so callers can check existence without try/catch.
   */
  async customerExistsByInternalId(request = {}) {
    try {
      const response =
        await this.selectCustomerByInternalId(request);

      return {
        exists: Boolean(response?.result),
        result: response?.result || null,
        response,
      };
    } catch (error) {
      if (
        error instanceof SelectCustomerServiceError &&
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

  // Shared GET + error handling for the single-customer endpoints.
  async #getCustomer(requestUrl, signal) {
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
      throw new SelectCustomerServiceError(
        data?.message ||
          `Error selecting customer: ${response.status}`,
        {
          status: response.status,
          response: data,
        },
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
    return {
      message: rawText,
    };
  }
}
