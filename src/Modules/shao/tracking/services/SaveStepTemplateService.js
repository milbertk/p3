import { APIShao } from "../../../../Shared/Utils/globalVar";

export default class SaveStepTemplateService {
  constructor(baseUrl = APIShao) {
    this.baseUrl = String(baseUrl || "").replace(/\/$/, "");
  }
  // POST /companies/{companyId}/step-templates  body: { template, steps }
  async save({ companyId, bundle, signal } = {}) {
    const c = String(companyId || "").trim();
    if (!c) throw new TypeError("The company ID is required.");
    const payload = {
      template: bundle?.template || {},
      steps: Array.isArray(bundle?.steps) ? bundle.steps : [],
    };
    const url = `${this.baseUrl}/companies/${encodeURIComponent(c)}/step-templates`;
    const res = await fetch(url, {
      method: "POST",
      credentials: "include",
      headers: { Accept: "application/json", "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal,
    });
    const data = await readJson(res);
    if (!res.ok) throw new Error(data?.message || `Error saving template: ${res.status}`);
    return data;
  }
}
function readJson(r){return r.text().then((t)=>{if(!t)return{};try{return JSON.parse(t);}catch{return{message:t};}});}