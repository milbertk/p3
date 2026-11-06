// authService.js
// Service layer for talking to the Go backend auth endpoints.
//
// Important: the backend sets the JWT as an HttpOnly cookie, so JavaScript
// CANNOT read it directly. Every request that needs auth must include
// `credentials: 'include'` so the browser attaches the cookie automatically.
// The backend's CORS must allow the frontend origin AND set
// Access-Control-Allow-Credentials: true (your router already does this).

import { APIUsers } from "../../../Shared/Utils/globalVar";

// ----------------------------------------------------------------------
// Config
// ----------------------------------------------------------------------

// Point this at your backend. In a real app, read from env:
//   const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;
// For Vite:
//   const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
const API_BASE_URL =
  (typeof process !== "undefined" && process.env && process.env.REACT_APP_API_BASE_URL) ||
  APIUsers;

// ----------------------------------------------------------------------
// Custom error so callers can distinguish auth failures from network/5xx
// ----------------------------------------------------------------------

export class AuthError extends Error {
  constructor(message, { status, payload } = {}) {
    super(message);
    this.name = "AuthError";
    this.status = status;
    this.payload = payload;
  }
}

// ----------------------------------------------------------------------
// Internal fetch helper
// ----------------------------------------------------------------------

async function request(path, { method = "GET", body, headers = {}, signal } = {}) {
  const url = `${API_BASE_URL}${path}`;

  console.log("aa")

  console.log(API_BASE_URL)

  console.log(url)

  const init = {
    method,
    credentials: "include", // <-- REQUIRED for HttpOnly cookie auth
    headers: {
      Accept: "application/json",
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...headers,
    },
    signal,
  };

  if (body !== undefined) {
    init.body = typeof body === "string" ? body : JSON.stringify(body);
  }

  let res;
  try {
    res = await fetch(url, init);
  } catch (err) {
    // Network failure, CORS block, DNS, etc.
    throw new AuthError(`Network error: ${err.message}`, { status: 0 });
  }

  // Try to parse JSON regardless of status — backend returns JSON on errors too.
  let payload = null;
  const text = await res.text();
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = { raw: text };
    }
  }

  if (!res.ok) {
    const msg =
      (payload && (payload.message || payload.status)) ||
      `Request failed with status ${res.status}`;
    throw new AuthError(msg, { status: res.status, payload });
  }

  return payload;
}

// ----------------------------------------------------------------------
// Public API
// ----------------------------------------------------------------------

/**
 * Login with a Firebase ID token.
 * Calls POST /login with `Authorization: Bearer <firebaseIdToken>`.
 * On success the backend sets the `access_token` HttpOnly cookie.
 *
 * @param {string} firebaseIdToken - ID token from Firebase Auth on the client
 * @returns {Promise<object>} login response payload
 */
export async function login(firebaseIdToken) {
  if (!firebaseIdToken) {
    throw new AuthError("Missing Firebase ID token", { status: 400 });
  }

  return request("/login", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${firebaseIdToken}`,
    },
  });
}

/**
 * Log the user out by asking the backend to clear the HttpOnly cookie.
 * Calls POST /logout.
 *
 * Because the cookie is HttpOnly, JavaScript cannot delete it directly —
 * only the server can. The backend responds with a Set-Cookie header that
 * overwrites the existing cookie with MaxAge=-1, telling the browser to
 * discard it. After this resolves, subsequent /getuserinfo calls will
 * return 401.
 *
 * @returns {Promise<object>} the logout response payload
 */
export async function logout() {
  return request("/logout", { method: "POST" });
}

/**
 * Fetch the raw /getuserinfo response from the backend.
 *
 * Response shape:
 *   {
 *     status, message,
 *     authenticated: boolean,
 *     inactive: boolean,
 *     email_verified: boolean,
 *     user: {
 *       uid, email, name, picture, phone_number,
 *       role, sign_in_provider, provider_id,
 *       local_status, active, disabled, email_verified_raw,
 *       last_sign_in, creation_time,
 *       issuer, issued_at, expires_at
 *     } | null
 *   }
 *
 * Throws AuthError with status 401 if there is no valid session.
 *
 * @param {AbortSignal} [signal] - optional, for cancellation
 * @returns {Promise<object>}
 */
export async function getUserInfo(signal) {
  return request("/getuserinfo", { method: "GET", signal });
}

/**
 * Convenience: returns a flattened user object describing the current
 * session, regardless of which "shape" the backend returned.
 *
 * Returns one of:
 *   - null                 → no valid session / user not in DB
 *   - { ...userFields,
 *       authenticated: false,
 *       inactive: true,
 *       inactiveReason,
 *       emailVerified }    → account exists but disabled / not active
 *                            / local status != ACTIVE
 *   - { ...userFields,
 *       authenticated: true,
 *       inactive: false,
 *       emailVerified }    → fully active session
 *
 * Network / 5xx errors are re-thrown so callers can handle them.
 *
 * @param {AbortSignal} [signal]
 * @returns {Promise<object|null>}
 */
export async function getCurrentUser(signal) {
  try {
    const me = await getUserInfo(signal);

    // No session, or user not found in DB → backend returns user: null.
    if (!me || !me.user) return null;

    // Account exists but is not usable.
    if (me.inactive) {
      return {
        ...me.user,
        authenticated: false,
        inactive: true,
        inactiveReason: me.message || "Account is inactive",
        emailVerified: !!me.email_verified,
      };
    }

    // Fully active session.
    return {
      ...me.user,
      authenticated: true,
      inactive: false,
      emailVerified: !!me.email_verified,
    };
  } catch (err) {
    if (err instanceof AuthError && err.status === 401) {
      return null;
    }
    throw err;
  }
}

// Default export grouping everything for code that prefers a single import.
export default {
  login,
  logout,
  getUserInfo,
  getCurrentUser,
  AuthError,
};