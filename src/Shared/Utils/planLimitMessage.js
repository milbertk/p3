/**
 * Plan limits (2026-10-22). The backend answers 403 with
 *   { result: { code, plan, planName, limit, feature } }
 * when the company's plan does not allow an action. planLimitMessage
 * returns a translated message for that case, or "" for any other error.
 *
 * @param {Error} error  error thrown by a service (with .response = backend body)
 * @param {Function} t   i18next t()
 */
export function readPlanLimit(error) {
  const result = error?.response?.result || error?.response?.data?.result || null;
  const code = String(result?.code || "");
  return code.startsWith("PLAN_") ? result : null;
}

export default function planLimitMessage(error, t) {
  const limit = readPlanLimit(error);
  if (!limit) return "";
  const plan = limit.planName || limit.plan || "";
  const translate = (key, fallback, options = {}) =>
    typeof t === "function"
      ? t(key, { defaultValue: fallback, ...options })
      : fallback.replace(/\{\{(\w+)\}\}/g, (_, name) => String(options[name] ?? ""));

  switch (limit.code) {
    case "PLAN_LIMIT_USERS":
      return translate(
        "plans.limits.users",
        "Your {{plan}} plan allows {{count}} active user(s), so you cannot add more users to this company. Request a plan from Home → Your plan.",
        { plan, count: limit.limit },
      );
    case "PLAN_REQUIRED":
      // No active plan (2026-10-23): the company is read-only.
      // 2026-10-29: only the basic company (Company page) can be set up.
      return translate(
        "plans.limits.required",
        "Your company doesn't have an active plan yet. Join a plan to use this option. Without a plan you can only set up your basic company (name, logo and header) in Company page. Choose a plan or request a free trial from Home → Your plan.",
      );
    case "PLAN_LIMIT_STORAGE":
      return translate(
        "plans.limits.storage",
        "Your {{plan}} plan includes {{count}} GB of storage and it is full. Delete files or request a plan with more storage from Home → Your plan.",
        { plan, count: limit.limit },
      );
    case "PLAN_LIMIT_PRODUCTS":
      return translate(
        "plans.limits.products",
        "Your {{plan}} plan allows {{count}} products. Deactivate a product or request a plan from Home → Your plan.",
        { plan, count: limit.limit },
      );
    default:
      return translate(
        "plans.limits.feature",
        "This option is not included in your {{plan}} plan. Request a plan from Home → Your plan.",
        { plan },
      );
  }
}
