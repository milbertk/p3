import { useEffect, useState } from "react";
import { getCompanyPlan, PLAN_CHANGED_EVENT } from "../../Services/CompanyPlanService";

/**
 * Loads the company's plan: { loading, error, data: { current, plans, pendingRequest } }.
 * Reloads when the plan changes (after a request) for this company.
 */
export default function useCompanyPlan(companyId) {
  const [state, setState] = useState({ loading: Boolean(companyId), error: "", data: null });
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const onChanged = (event) => {
      const changed = String(event?.detail?.companyId || "");
      if (!changed || changed === String(companyId || "")) setReloadKey((k) => k + 1);
    };
    window.addEventListener(PLAN_CHANGED_EVENT, onChanged);
    return () => window.removeEventListener(PLAN_CHANGED_EVENT, onChanged);
  }, [companyId]);

  useEffect(() => {
    let cancelled = false;
    if (!companyId) {
      setState({ loading: false, error: "", data: null });
      return undefined;
    }
    setState((current) => ({ ...current, loading: true, error: "" }));
    getCompanyPlan(companyId)
      .then((data) => {
        if (!cancelled) setState({ loading: false, error: "", data });
      })
      .catch((error) => {
        if (!cancelled) setState({ loading: false, error: error?.message || "error", data: null });
      });
    return () => {
      cancelled = true;
    };
  }, [companyId, reloadKey]);

  return state;
}
