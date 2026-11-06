// =====================================================================
//  ReportsService — calls the read-only report endpoints.
//
//  Each method returns the backend `result` object, or throws on error.
//  Adjust API_BASE / the fetch call to match your project's API client
//  (axios instance, auth headers, etc.) if you use one elsewhere.
// =====================================================================

// Base URL comes from your shared globalVar.js (src/shareUtils/globalVar.js),
// the same file your other services import APIShao from.
// ADJUST the number of "../" to match this file's location — copy the exact
// path from a sibling service in this same folder that already imports APIShao.
import { APIShao } from "../../../../Shared/Utils/globalVar";

const API_BASE =
  (typeof process !== "undefined" && process.env && process.env.REACT_APP_API_BASE_URL) ||
  APIShao;

async function getJSON(url) {
  const res = await fetch(url, {
    method: "GET",
    credentials: "include",
    headers: { Accept: "application/json" },
  });
  let body = null;
  try {
    body = await res.json();
  } catch {
    body = null;
  }
  if (!res.ok) {
    const msg = (body && body.message) || `Request failed (${res.status})`;
    throw new Error(msg);
  }
  // Backend wraps payloads as { status, message, result }.
  return body && Object.prototype.hasOwnProperty.call(body, "result") ? body.result : body;
}

function qs(params) {
  const usable = Object.entries(params || {}).filter(
    ([, v]) => v !== undefined && v !== null && String(v).trim() !== "" && v !== "all",
  );
  if (usable.length === 0) return "";
  return "?" + usable.map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join("&");
}

const base = (companyId) => `${API_BASE}/companies/${encodeURIComponent(companyId)}/reports`;

const ReportsService = {
  getOrdersByStatus(companyId, { from, to, status } = {}) {
    return getJSON(`${base(companyId)}/orders-by-status${qs({ from, to, status })}`);
  },
  getAppointmentsSummary(companyId, { from, to, status } = {}) {
    return getJSON(`${base(companyId)}/appointments-summary${qs({ from, to, status })}`);
  },
  getTopCustomers(companyId, { limit } = {}) {
    return getJSON(`${base(companyId)}/top-customers${qs({ limit })}`);
  },
  getBestSellers(companyId, { type, limit } = {}) {
    return getJSON(`${base(companyId)}/best-sellers${qs({ type, limit })}`);
  },
  getAgingOrders(companyId, { status, minDays } = {}) {
    return getJSON(`${base(companyId)}/aging-orders${qs({ status, minDays })}`);
  },
  getCancellationRate(companyId, { from, to } = {}) {
    return getJSON(`${base(companyId)}/cancellation-rate${qs({ from, to })}`);
  },
  getRevenueOverTime(companyId, { from, to, granularity } = {}) {
    return getJSON(`${base(companyId)}/revenue-over-time${qs({ from, to, granularity })}`);
  },
};

export default ReportsService;