import { useState } from "react";
import { useTranslation } from "react-i18next";
import { FaCrown } from "react-icons/fa";
import useCompanyPlan from "./useCompanyPlan";
import PlansModal from "./PlansModal";
import "./Plans.scss";

/**
 * "Your plan: Entrepreneur" button (Home page, next to "Configure company page").
 * Without an active plan it says "No active plan · read-only".
 * Opens the plans window with the comparison and the request form.
 */
export default function PlanBadge({ companyId, companyName = "", className = "" }) {
  const { t } = useTranslation();
  const tr = (key, fallback, options = {}) => t(key, { defaultValue: fallback, ...options });
  const { data, loading } = useCompanyPlan(companyId);
  const [open, setOpen] = useState(false);

  if (!companyId) return null;

  const current = data?.current;
  const code = current?.planCode || "";
  const name = code ? tr(`plans.names.${code}`, current?.plan?.name || code) : "…";
  let extra = "";
  if (current && current.active === false) extra = ` · ${tr("plans.badge.readOnly", "read-only")}`;
  else if (current?.expired) extra = ` · ${tr("plans.badge.ended", "trial ended")}`;
  else if (current?.endsAt && current?.daysLeft != null)
    extra = ` · ${tr("plans.badge.daysLeft", "{{count}} days left", { count: current.daysLeft })}`;

  return (
    <>
      <button
        type="button"
        className={`plan-badge plan-badge--${code.toLowerCase() || "loading"} ${className}`}
        onClick={() => setOpen(true)}
        title={tr("plans.badge.title", "See what your plan includes and request another plan")}
        disabled={loading && !data}
      >
        <FaCrown aria-hidden="true" />
        {tr("plans.badge.label", "Your plan: {{plan}}", { plan: name })}
        {extra}
      </button>
      <PlansModal show={open} onClose={() => setOpen(false)} companyId={companyId} companyName={companyName} />
    </>
  );
}
