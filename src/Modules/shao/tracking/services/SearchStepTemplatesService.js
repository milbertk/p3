import { APIShao } from "../../../../Shared/Utils/globalVar";

export default class SearchStepTemplatesService {
  constructor(baseUrl = APIShao) {
    this.baseUrl = String(baseUrl || "").replace(/\/$/, "");
  }
  // GET /companies/{companyId}/step-templates/search?term=
  // includeInactive (2026-10-30): the maintenance screen also lists disabled
  // processes; the product form leaves it false (only active ones).
  async search({ companyId, term = "", limit, offset, includeInactive = false, signal } = {}) {
    const c = String(companyId || "").trim();
    if (!c) throw new TypeError("The company ID is required.");
    const params = new URLSearchParams();
    if (String(term).trim()) params.set("term", String(term).trim());
    if (limit) params.set("limit", String(limit));
    if (offset) params.set("offset", String(offset));
    if (includeInactive) params.set("includeInactive", "true");
    const qs = params.toString();
    const url = `${this.baseUrl}/companies/${encodeURIComponent(c)}/step-templates/search` + (qs ? `?${qs}` : "");
    const res = await fetch(url, { method: "GET", credentials: "include", headers: { Accept: "application/json" }, signal });
    const data = await readJson(res);
    if (!res.ok) throw new Error(data?.message || `Error searching templates: ${res.status}`);
    return data;
  }
  async getTemplates(request = {}) {
    const res = await this.search(request);
    return res?.result || [];
  }
}
function readJson(r){return r.text().then((t)=>{if(!t)return{};try{return JSON.parse(t);}catch{return{message:t};}});}