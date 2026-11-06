import { APIShao } from "../../../../Shared/Utils/globalVar";

export default class SelectStepTemplateService {
  constructor(baseUrl = APIShao) {
    this.baseUrl = String(baseUrl || "").replace(/\/$/, "");
  }
  // GET /companies/{companyId}/step-templates/{stepTemplateId}
  async selectById({ companyId, stepTemplateId, signal } = {}) {
    const c = String(companyId || "").trim();
    const id = String(stepTemplateId || "").trim();
    if (!c) throw new TypeError("The company ID is required.");
    if (!id) throw new TypeError("The template ID is required.");
    const url = `${this.baseUrl}/companies/${encodeURIComponent(c)}/step-templates/${encodeURIComponent(id)}`;
    const res = await fetch(url, { method: "GET", credentials: "include", headers: { Accept: "application/json" }, signal });
    const data = await readJson(res);
    if (!res.ok) throw new Error(data?.message || `Error selecting template: ${res.status}`);
    return data;
  }
  async getBundle(request = {}) {
    const res = await this.selectById(request);
    return res?.result || null;
  }
}
function readJson(r){return r.text().then((t)=>{if(!t)return{};try{return JSON.parse(t);}catch{return{message:t};}});}