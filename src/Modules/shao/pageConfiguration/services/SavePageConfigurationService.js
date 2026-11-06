import { APIShao } from "../../../../Shared/Utils/globalVar";

export class SavePageConfigurationServiceError extends Error {
  constructor(message, { status, response } = {}) {
    super(message);

    this.name = "SavePageConfigurationServiceError";
    this.status = status;
    this.response = response;
  }
}

export default class SavePageConfigurationService {
  constructor(baseUrl = APIShao) {
    this.baseUrl = String(baseUrl || "").replace(/\/$/, "");
  }

  /**
   * Creates or replaces the page configuration of the selected company.
   *
   * Backend route:
   * PUT /companies/{companyId}/page-configuration
   *
   * @param {object} params.configuration
   *   { displayName, fontFamily, slug, logoUrl, logoPath, headerUrl, headerPath,
   *     notificationEmail, contactWhatsapp, notificationLanguage,
   *     timeZone, timeZoneLabel }
   *   slug: readable store address ("" = use the internal id). A 409 answer
   *   means another company already uses it.
   * @returns {Promise<object>} the saved configuration
   */
  async savePageConfiguration({ companyId, configuration, signal } = {}) {
    const normalizedCompanyId = String(companyId || "").trim();

    if (!normalizedCompanyId) {
      throw new TypeError("The selected company ID is required.");
    }

    const payload = {
      displayName: String(configuration?.displayName || "").trim(),
      fontFamily: configuration?.fontFamily || null,
      logoUrl: configuration?.logoUrl || null,
      logoPath: configuration?.logoPath || null,
      headerUrl: configuration?.headerUrl || null,
      headerPath: configuration?.headerPath || null,
      // Readable store address; null = the store link uses the internal id.
      slug: String(configuration?.slug || "").trim() || null,
      // One currency for the whole store ("$" when empty) + how to pay.
      currencySymbol: String(configuration?.currencySymbol || "").trim() || "$",
      paymentInstructions: String(configuration?.paymentInstructions || "").trim() || null,
      // Communication with customers.
      notificationEmail: String(configuration?.notificationEmail || "").trim() || null,
      contactWhatsapp: String(configuration?.contactWhatsapp || "").trim() || null,
      // Store "Contact us" + customer service (2026-10-31).
      socialLink: String(configuration?.socialLink || "").trim() || null,
      socialLinkType: String(configuration?.socialLink || "").trim()
        ? String(configuration?.socialLinkType || "OTHER").trim().toUpperCase()
        : null,
      customerServiceEmail: String(configuration?.customerServiceEmail || "").trim() || null,
      notificationLanguage: configuration?.notificationLanguage || "en",
      // AlephK general email while the company has no SMTP (2026-10-30).
      useDefaultSmtp: Boolean(configuration?.useDefaultSmtp),
      // Legal texts shown in the store (empty = not shown).
      termsText: String(configuration?.termsText || "").trim() || null,
      privacyText: String(configuration?.privacyText || "").trim() || null,
      // Company time zone (2026-11-04): IANA name ("" = Costa Rica on the
      // server) + optional text for customers (max 60).
      timeZone: String(configuration?.timeZone || "").trim(),
      timeZoneLabel: String(configuration?.timeZoneLabel || "").trim() || null,
    };

    const requestUrl =
      `${this.baseUrl}/companies/` +
      `${encodeURIComponent(normalizedCompanyId)}` +
      "/page-configuration";

    let response;

    try {
      response = await fetch(requestUrl, {
        method: "PUT",
        credentials: "include",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
        signal,
      });
    } catch (cause) {
      console.error("[SavePageConfigurationService] Request failed:", cause);
      throw new SavePageConfigurationServiceError(
        "The server could not be reached while saving the page configuration.",
        { status: 0, response: null },
      );
    }

    const data = await readResponse(response);

    if (!response.ok) {
      throw new SavePageConfigurationServiceError(
        data?.message || `Error saving page configuration: ${response.status}`,
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
