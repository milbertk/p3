import { APIShao } from "../Utils/globalVar";

/**
 * Company plan (2026-10-22).
 *
 *   GET  {APIShao}/companies/{companyId}/plan          -> { current, plans, pendingRequest }
 *   POST {APIShao}/companies/{companyId}/plan-requests -> saved request
 *
 * The plan is cached for a short time per company so the badge, the
 * reports and the forms do not ask the server again and again.
 * After a request, call refreshCompanyPlan(companyId).
 */

const CACHE_MS = 30 * 1000;
const cache = new Map(); // companyId -> { at, promise }
export const PLAN_CHANGED_EVENT = "companyPlanChanged";

export class CompanyPlanServiceError extends Error {
  constructor(message, { status, response } = {}) {
    super(message);
    this.name = "CompanyPlanServiceError";
    this.status = status;
    this.response = response;
  }
}

function baseUrl(companyId) {
  const id = String(companyId || "").trim();
  if (!id) throw new TypeError("The selected company ID is required.");
  return `${String(APIShao || "").replace(/\/$/, "")}/companies/${encodeURIComponent(id)}`;
}

async function request(url, { method = "GET", body, signal, headers = {} } = {}) {
  let response;
  try {
    response = await fetch(url, {
      method,
      credentials: "include",
      headers: {
        Accept: "application/json",
        ...(body ? { "Content-Type": "application/json" } : {}),
        ...headers,
      },
      body: body ? JSON.stringify(body) : undefined,
      signal,
    });
  } catch (cause) {
    if (cause?.name === "AbortError") throw cause;
    throw new CompanyPlanServiceError("The server could not be reached.", { status: 0 });
  }

  let data = null;
  try {
    const text = await response.text();
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }
  if (!response.ok) {
    throw new CompanyPlanServiceError(data?.message || `Plan request failed: ${response.status}`, {
      status: response.status,
      response: data,
    });
  }
  return data?.result ?? null;
}

/** Current plan + plans list (cached). */
export function getCompanyPlan(companyId, { force = false } = {}) {
  const id = String(companyId || "").trim();
  if (!id) return Promise.resolve(null);
  const hit = cache.get(id);
  if (!force && hit && Date.now() - hit.at < CACHE_MS) return hit.promise;
  const promise = request(`${baseUrl(id)}/plan`).catch((error) => {
    cache.delete(id);
    throw error;
  });
  cache.set(id, { at: Date.now(), promise });
  return promise;
}

/** Forget the cached plan and tell the screens to reload it. */
export function refreshCompanyPlan(companyId) {
  cache.delete(String(companyId || "").trim());
  window.dispatchEvent(new CustomEvent(PLAN_CHANGED_EVENT, { detail: { companyId } }));
}

/**
 * Sends the "Request a plan" form.
 * @param {object} form { requestedPlan, contactName, contactEmail, contactPhone, message, language }
 * @param {string} captchaToken Cloudflare Turnstile token (2026-10-25), sent as X-Captcha-Token.
 */
export async function sendPlanRequest(companyId, form, captchaToken = "") {
  const result = await request(`${baseUrl(companyId)}/plan-requests`, {
    method: "POST",
    headers: captchaToken ? { "X-Captcha-Token": captchaToken } : {},
    body: {
      requestedPlan: String(form?.requestedPlan || "").trim(),
      contactName: String(form?.contactName || "").trim(),
      contactEmail: String(form?.contactEmail || "").trim(),
      contactPhone: String(form?.contactPhone || "").trim(),
      message: String(form?.message || "").trim(),
      language: String(form?.language || "").trim(),
    },
  });
  refreshCompanyPlan(companyId);
  return result;
}
