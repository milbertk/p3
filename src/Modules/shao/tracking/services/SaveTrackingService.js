import { APIShao } from "../../../../Shared/Utils/globalVar";

export class SaveTrackingServiceError extends Error {
  constructor(
    message,
    { status, statusText, response, request, cause } = {},
  ) {
    super(message);
    this.name = "SaveTrackingServiceError";
    this.status = status;
    this.statusText = statusText;
    this.response = response;
    this.request = request;
    this.cause = cause;
  }
}

export default class SaveTrackingService {
  constructor(baseUrl = APIShao) {
    this.baseUrl = String(baseUrl || "").replace(/\/$/, "");
  }

  /**
   * Creates or updates a tracking and rewrites its steps.
   *
   * Backend route:
   * POST /companies/{companyId}/trackings
   *
   * @param {object} params
   * @param {string} params.companyId
   * @param {object} params.tracking  the bundle: { config, steps }
   */
  async saveTracking({ companyId, tracking, signal } = {}) {
    const normalizedCompanyId = String(companyId || "").trim();
    if (!normalizedCompanyId) {
      throw new TypeError("The selected company ID is required.");
    }
    if (!tracking || typeof tracking !== "object" || Array.isArray(tracking)) {
      throw new TypeError("The tracking object is required.");
    }

    const payload = {
      config: tracking.config || {},
      steps: Array.isArray(tracking.steps) ? tracking.steps : [],
    };

    const requestUrl =
      `${this.baseUrl}/companies/` +
      `${encodeURIComponent(normalizedCompanyId)}` +
      "/trackings";

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
      logTrackingServiceError({
        title: "The request failed before receiving an HTTP response",
        request: requestDetails,
        cause,
      });
      throw new SaveTrackingServiceError(
        cause?.name === "AbortError"
          ? "The tracking request was cancelled."
          : "The server could not be reached while saving the tracking.",
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
      const serviceError = new SaveTrackingServiceError(
        data?.message || `Error saving tracking: ${response.status}`,
        {
          status: response.status,
          statusText: response.statusText,
          response: data,
          request: requestDetails,
        },
      );
      logTrackingServiceError({
        title: "The backend rejected the tracking request",
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

function logTrackingServiceError({ title, request, response, cause }) {
  console.group(`[SaveTrackingService] ${title}`);
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
