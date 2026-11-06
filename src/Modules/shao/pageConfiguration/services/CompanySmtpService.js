import { APIShao } from "../../../../Shared/Utils/globalVar";

export class CompanySmtpServiceError extends Error {
  constructor(message, { status, response } = {}) {
    super(message);

    this.name = "CompanySmtpServiceError";
    this.status = status;
    this.response = response;
  }
}

/**
 * The company's own SMTP (email server) used to send notifications.
 *
 * Backend routes:
 *   GET  /companies/{companyId}/smtp-configuration       -> config without password
 *   PUT  /companies/{companyId}/smtp-configuration       -> save (empty password keeps the saved one)
 *   POST /companies/{companyId}/smtp-configuration/test  -> send a test email
 */
export default class CompanySmtpService {
  constructor(baseUrl = APIShao) {
    this.baseUrl = String(baseUrl || "").replace(/\/$/, "");
  }

  buildUrl(companyId, suffix = "") {
    const normalizedCompanyId = String(companyId || "").trim();
    if (!normalizedCompanyId) {
      throw new TypeError("The selected company ID is required.");
    }
    return (
      `${this.baseUrl}/companies/` +
      `${encodeURIComponent(normalizedCompanyId)}` +
      `/smtp-configuration${suffix}`
    );
  }

  async request(url, { method = "GET", body, signal } = {}) {
    let response;
    try {
      response = await fetch(url, {
        method,
        credentials: "include",
        headers: {
          Accept: "application/json",
          ...(body ? { "Content-Type": "application/json" } : {}),
        },
        body: body ? JSON.stringify(body) : undefined,
        signal,
      });
    } catch (cause) {
      if (cause?.name === "AbortError") throw cause;
      console.error("[CompanySmtpService] Request failed:", cause);
      throw new CompanySmtpServiceError(
        "The server could not be reached.",
        { status: 0, response: null },
      );
    }

    const data = await readResponse(response);
    if (!response.ok) {
      throw new CompanySmtpServiceError(
        data?.message || `SMTP request failed: ${response.status}`,
        { status: response.status, response: data },
      );
    }
    return data?.result || null;
  }

  /** @returns {Promise<object>} { configured, host, port, security, username, fromEmail, fromName, enabled, hasPassword, lastTestAt, lastTestOk, lastTestError } */
  selectSmtp({ companyId, signal } = {}) {
    return this.request(this.buildUrl(companyId), { signal });
  }

  /** @param {object} smtp { host, port, security, username, password, fromEmail, fromName, enabled } */
  saveSmtp({ companyId, smtp, signal } = {}) {
    const payload = {
      host: String(smtp?.host || "").trim(),
      port: Number(smtp?.port) || 0,
      security: String(smtp?.security || "STARTTLS"),
      username: String(smtp?.username || "").trim(),
      password: String(smtp?.password || ""),
      fromEmail: String(smtp?.fromEmail || "").trim(),
      fromName: String(smtp?.fromName || "").trim(),
      enabled: Boolean(smtp?.enabled),
    };
    return this.request(this.buildUrl(companyId), { method: "PUT", body: payload, signal });
  }

  /** @returns {Promise<object>} { ok, sentTo, error, testedAt } */
  testSmtp({ companyId, to = "", signal } = {}) {
    return this.request(this.buildUrl(companyId, "/test"), {
      method: "POST",
      body: { to: String(to || "").trim() },
      signal,
    });
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
