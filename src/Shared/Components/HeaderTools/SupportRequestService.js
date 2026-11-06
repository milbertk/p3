import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { APIUsers } from "../../Utils/globalVar";
import { firebaseStorage } from "../../firebase/firebase";

// Support requests (2026-10-24): saved in usersAK (tbl_support_request) and
// emailed to the support team by the backend.
//   POST {APIUsers}/supportrequests   (session cookie)

const SELECTED_COMPANY_STORAGE_KEY = "selectedCompany";

export class SupportRequestError extends Error {
  constructor(message, { status, code } = {}) {
    super(message);
    this.name = "SupportRequestError";
    this.status = status;
    this.code = code;
  }
}

// The company the user is working in (optional for support).
export function readSelectedCompany() {
  try {
    const raw = localStorage.getItem(SELECTED_COMPANY_STORAGE_KEY);
    if (!raw) return { companyId: "", companyName: "" };
    const parsed = JSON.parse(raw);
    return {
      companyId: String(parsed?.companyId || parsed?.id || "").trim(),
      companyName: String(parsed?.companyName || parsed?.name || "").trim(),
    };
  } catch {
    return { companyId: "", companyName: "" };
  }
}

function uniqueId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function safeFileName(name) {
  return String(name || "image").toLowerCase().replace(/[^a-z0-9.\-_]/g, "-");
}

/**
 * Uploads the screenshots to Firebase Storage, in the company folder:
 *   companies/{companyId}/support/{uuid}-{filename}
 * Best effort: returns the URLs that were uploaded and how many failed, so
 * the request is still sent when Storage rules block an upload.
 */
export async function uploadSupportImages(companyId, files = []) {
  const urls = [];
  let failed = 0;
  const folder = companyId ? `companies/${companyId}/support` : "support";
  for (const file of files) {
    try {
      const storageRef = ref(firebaseStorage, `${folder}/${uniqueId()}-${safeFileName(file?.name)}`);
      await uploadBytes(storageRef, file, { contentType: file.type });
      urls.push(await getDownloadURL(storageRef));
    } catch (error) {
      console.error("Support image upload failed:", error);
      failed += 1;
    }
  }
  return { urls, failed };
}

/**
 * Sends the support request. Returns { ticketCode, createdAt }.
 * captchaToken: Cloudflare Turnstile token (2026-10-25), sent as X-Captcha-Token.
 */
export async function sendSupportRequest(payload, captchaToken = "") {
  let response;
  try {
    response = await fetch(`${APIUsers}/supportrequests`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...(captchaToken ? { "X-Captcha-Token": captchaToken } : {}),
      },
      body: JSON.stringify(payload),
    });
  } catch (cause) {
    throw new SupportRequestError("Network error", { code: "NETWORK" });
  }

  let data = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    const serverCode = data?.data?.code || "";
    const code = String(serverCode).startsWith("CAPTCHA_")
      ? "CAPTCHA"
      : response.status === 429
        ? "TOO_MANY"
        : response.status === 400
          ? "INVALID"
          : "FAILED";
    throw new SupportRequestError(data?.message || `Error ${response.status}`, {
      status: response.status,
      code,
    });
  }
  return data?.data || data?.result || {};
}
