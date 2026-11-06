import { APIShao } from "../../../../Shared/Utils/globalVar";

/**
 * Delete an unused process / enable or disable a process (2026-10-30).
 *
 *   DELETE {APIShao}/companies/{companyId}/step-templates/{stepTemplateId}
 *          409 when products or orders use it (disable it instead)
 *   PUT    {APIShao}/companies/{companyId}/step-templates/{stepTemplateId}/active   { active }
 */
export default class StepTemplateStatusService {
  constructor(baseUrl = APIShao) {
    this.baseUrl = String(baseUrl || "").replace(/\/$/, "");
  }

  buildUrl(companyId, stepTemplateId, suffix = "") {
    const c = String(companyId || "").trim();
    const id = String(stepTemplateId || "").trim();
    if (!c) throw new TypeError("The company ID is required.");
    if (!id) throw new TypeError("The template ID is required.");
    return `${this.baseUrl}/companies/${encodeURIComponent(c)}/step-templates/${encodeURIComponent(id)}${suffix}`;
  }

  async remove({ companyId, stepTemplateId } = {}) {
    const res = await fetch(this.buildUrl(companyId, stepTemplateId), {
      method: "DELETE",
      credentials: "include",
      headers: { Accept: "application/json" },
    });
    const data = await readJson(res);
    if (!res.ok) throw new Error(data?.message || `Error deleting the process: ${res.status}`);
    return data;
  }

  async setActive({ companyId, stepTemplateId, active } = {}) {
    const res = await fetch(this.buildUrl(companyId, stepTemplateId, "/active"), {
      method: "PUT",
      credentials: "include",
      headers: { Accept: "application/json", "Content-Type": "application/json" },
      body: JSON.stringify({ active: Boolean(active) }),
    });
    const data = await readJson(res);
    if (!res.ok) throw new Error(data?.message || `Error changing the process status: ${res.status}`);
    return data;
  }
}

function readJson(r) {
  return r.text().then((t) => {
    if (!t) return {};
    try {
      return JSON.parse(t);
    } catch {
      return { message: t };
    }
  });
}
