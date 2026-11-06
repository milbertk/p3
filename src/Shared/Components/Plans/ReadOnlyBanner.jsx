import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { FaLock } from "react-icons/fa";
import useCompanyPlan from "./useCompanyPlan";
import PlansModal from "./PlansModal";
import "./Plans.scss";

const SELECTED_COMPANY_STORAGE_KEY = "selectedCompany";

function readSelectedCompany() {
  try {
    const raw = localStorage.getItem(SELECTED_COMPANY_STORAGE_KEY);
    if (!raw) return { id: "", name: "" };
    const parsed = JSON.parse(raw);
    return {
      id: String(parsed?.companyId || parsed?.id || "").trim(),
      name: String(parsed?.companyName || parsed?.name || "").trim(),
    };
  } catch {
    return { id: "", name: "" };
  }
}

/**
 * Read-only banner (2026-10-23): shown on every screen when the selected
 * company has no active plan (new company, or its plan / trial ended).
 * The company can see its data but cannot create or change anything until a
 * plan is assigned. The button opens the plans window to request one.
 */
export default function ReadOnlyBanner() {
  const { t } = useTranslation();
  const tr = (key, fallback, options = {}) => t(key, { defaultValue: fallback, ...options });
  const [company, setCompany] = useState(readSelectedCompany);
  const [open, setOpen] = useState(false);
  const { data } = useCompanyPlan(company.id);

  // Follow the company selector (HeaderTemplate dispatches this event).
  useEffect(() => {
    const onChange = () => setCompany(readSelectedCompany());
    window.addEventListener("selectedCompanyChanged", onChange);
    return () => window.removeEventListener("selectedCompanyChanged", onChange);
  }, []);

  const current = data?.current;
  if (!company.id || !current || current.active !== false) return null;

  return (
    <>
      <div className="plan-readonly-banner" role="status">
        <FaLock aria-hidden="true" />
        <p>
          <strong>{tr("plans.readOnly.title", "Read-only mode")}</strong>{" "}
          {current.expired
            ? tr("plans.readOnly.ended", "Your plan ended. You can see your data, but you cannot create or change anything until you choose a plan.")
            : tr("plans.readOnly.none", "Your company has no active plan. You can see your data and set up your basic company (name, logo and header) in Company page, but you cannot use the other options until you join a plan or start a free trial.")}
        </p>
        <button type="button" onClick={() => setOpen(true)}>
          {tr("plans.readOnly.button", "Choose a plan")}
        </button>
      </div>
      <PlansModal show={open} onClose={() => setOpen(false)} companyId={company.id} companyName={company.name} />
    </>
  );
}
