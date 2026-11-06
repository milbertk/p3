import i18next from "i18next";
import { APIShao } from "../Utils/globalVar";
import planLimitMessage from "../Utils/planLimitMessage";

/**
 * Company storage (2026-10-23). Files go from the app straight to Firebase,
 * so shao keeps the size of each file per company and compares the total
 * with the plan storage (tbl_plans.storage_gb).
 *
 *   GET  {APIShao}/companies/{companyId}/storage               -> { usedBytes, limitBytes, storageGb, planCode }
 *   POST {APIShao}/companies/{companyId}/storage/check         { sizeBytes }  (before uploading)
 *   POST {APIShao}/companies/{companyId}/storage/files         { storagePath, sizeBytes, kind }  (images, after uploading)
 *   POST {APIShao}/companies/{companyId}/storage/files/delete  { storagePath }  (after deleting)
 *
 * Order and tracking attachments are registered by shao when they are saved.
 */

export const STORAGE_KINDS = {
  productImage: "PRODUCT_IMAGE",
  pageImage: "PAGE_IMAGE",
  other: "OTHER",
};

export class StorageLimitError extends Error {
  constructor(message, { status, response } = {}) {
    super(message);
    this.name = "StorageLimitError";
    this.status = status;
    this.response = response; // planLimitMessage() reads response.result.code
  }
}

function companyUrl(companyId) {
  const id = String(companyId || "").trim();
  if (!id) throw new TypeError("The selected company ID is required.");
  return `${String(APIShao || "").replace(/\/$/, "")}/companies/${encodeURIComponent(id)}`;
}

async function call(url, { method = "GET", body } = {}) {
  const response = await fetch(url, {
    method,
    credentials: "include",
    headers: {
      Accept: "application/json",
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  let data = null;
  try {
    const text = await response.text();
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }
  return { response, data };
}

/** companies/{companyId}/... -> companyId ("" when the path has another shape). */
export function companyIdFromPath(path) {
  const match = /^companies\/([^/]+)\//.exec(String(path || "").trim());
  return match ? match[1] : "";
}

/** Storage used and the plan limit. */
export async function getStorageUsage(companyId) {
  const { response, data } = await call(`${companyUrl(companyId)}/storage`);
  if (!response.ok) throw new Error(data?.message || `Storage request failed: ${response.status}`);
  return data?.result || null;
}

/**
 * Throws StorageLimitError (translated message) when a file of sizeBytes does
 * not fit in the plan, or the company has no active plan. Network or server
 * errors never block the upload.
 */
// kind (2026-10-29): PAGE_IMAGE lets a company without a plan upload its
// basic company logo and header.
export async function ensureStorageSpace(companyId, sizeBytes, kind = "") {
  if (!String(companyId || "").trim()) return;
  let result;
  try {
    result = await call(`${companyUrl(companyId)}/storage/check`, {
      method: "POST",
      body: { sizeBytes: Math.max(0, Number(sizeBytes) || 0), ...(kind ? { kind } : {}) },
    });
  } catch (cause) {
    console.warn("[StorageService] storage check skipped:", cause);
    return;
  }
  const { response, data } = result;
  if (response.ok) return;
  const error = new StorageLimitError(data?.message || "The file does not fit in your plan storage.", {
    status: response.status,
    response: data,
  });
  const message = planLimitMessage(error, i18next.t.bind(i18next));
  if (message) {
    error.message = message;
    throw error;
  }
  if (response.status === 400) throw error; // e.g. file too big
  console.warn("[StorageService] storage check failed, upload allowed:", response.status);
}

/** Records an uploaded image so it counts in the company storage (best-effort). */
export async function registerStorageFile(companyId, { storagePath, sizeBytes, kind = STORAGE_KINDS.other } = {}) {
  if (!String(companyId || "").trim() || !String(storagePath || "").trim()) return;
  try {
    const { response, data } = await call(`${companyUrl(companyId)}/storage/files`, {
      method: "POST",
      body: { storagePath, sizeBytes: Math.max(0, Number(sizeBytes) || 0), kind },
    });
    if (!response.ok) console.warn("[StorageService] file not registered:", data?.message || response.status);
  } catch (cause) {
    console.warn("[StorageService] file not registered:", cause);
  }
}

/** Stops counting a deleted file (best-effort). */
export async function forgetStorageFile(companyId, storagePath) {
  const id = String(companyId || "").trim() || companyIdFromPath(storagePath);
  if (!id || !String(storagePath || "").trim()) return;
  try {
    await call(`${companyUrl(id)}/storage/files/delete`, { method: "POST", body: { storagePath } });
  } catch (cause) {
    console.warn("[StorageService] file not removed from the count:", cause);
  }
}
