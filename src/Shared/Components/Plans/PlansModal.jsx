import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import {
  FaCheck,
  FaTimes,
  FaCrown,
  FaPaperPlane,
  FaArrowLeft,
  FaRegClock,
  FaCheckCircle,
  FaBuilding,
} from "react-icons/fa";
import useCompanyPlan from "./useCompanyPlan";
import { sendPlanRequest } from "../../Services/CompanyPlanService";
import useCaptcha, { CaptchaWidget, isCaptchaError } from "../../Hooks/useCaptcha";
import { getStorageUsage } from "../../Services/StorageService";
import "./Plans.scss";

/**
 * "Your plan" window (2026-10-22; 2026-10-23: no free plan, ENTREPRENEUR,
 * SPECIAL only for who has it, storage used, read-only without a plan):
 *   - the company's current plan, trial days left and usage (users, products, storage);
 *   - every plan side by side with its price and what it includes
 *     (prices and limits come from tbl_plans in the database);
 *   - "Request a plan" form -> saved + emailed to AlephK; "An agent will
 *     contact you soon".
 *
 * Props: show, onClose, companyId, companyName, initialPlan (open the form
 * with this plan selected), reason (short text shown on top, e.g. why a
 * report is locked).
 */
export default function PlansModal({ show, onClose, companyId, companyName = "", initialPlan = "", reason = "" }) {
  const { t, i18n } = useTranslation();
  const tr = (key, fallback, options = {}) => t(key, { defaultValue: fallback, ...options });
  const language = String(i18n?.language || "en").toLowerCase().startsWith("es") ? "es" : "en";
  const locale = language === "es" ? "es-CR" : "en-US";

  const { loading, error, data } = useCompanyPlan(show ? companyId : "");
  const current = data?.current || null;
  const plans = useMemo(() => data?.plans || [], [data]);
  const requestable = useMemo(() => plans.filter((p) => p.requestable), [plans]);
  // Basic company (2026-10-29): name, logo and header must be set up in
  // Company page before a plan can be requested. Filled from the server
  // (plan window) or from a 409 BASIC_COMPANY_REQUIRED answer.
  const [basicMissingFromServer, setBasicMissingFromServer] = useState(null);
  const basicMissing = basicMissingFromServer || data?.basicCompanyMissing || [];
  const needsBasicCompany = basicMissing.length > 0;

  const [view, setView] = useState("plans"); // plans | form | sent
  const [form, setForm] = useState({ requestedPlan: "", contactName: "", contactEmail: "", contactPhone: "", message: "" });
  const [sending, setSending] = useState(false);
  const [formError, setFormError] = useState("");
  const [storage, setStorage] = useState(null);
  // CAPTCHA (Cloudflare Turnstile, 2026-10-25) on the request form.
  const planCaptcha = useCaptcha();

  // Storage used vs. the plan storage (best-effort).
  useEffect(() => {
    if (!show || !companyId) return undefined;
    let cancelled = false;
    getStorageUsage(companyId)
      .then((usage) => {
        if (!cancelled) setStorage(usage);
      })
      .catch(() => {
        if (!cancelled) setStorage(null);
      });
    return () => {
      cancelled = true;
    };
  }, [show, companyId]);

  useEffect(() => {
    if (!show) return;
    setFormError("");
    setView(initialPlan ? "form" : "plans");
    setForm((f) => ({ ...f, requestedPlan: initialPlan || f.requestedPlan }));
    setBasicMissingFromServer(null);
  }, [show, initialPlan]);

  // Basic company missing (2026-10-29): show the plans view with the notice
  // instead of the request form.
  useEffect(() => {
    if (show && needsBasicCompany && view === "form") setView("plans");
  }, [show, needsBasicCompany, view]);

  useEffect(() => {
    if (!show) return undefined;
    const onKey = (event) => {
      if (event.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [show, onClose]);

  if (!show) return null;

  const planName = (code) =>
    tr(`plans.names.${code}`, plans.find((p) => p.planCode === code)?.name || code);

  const priceText = (plan) => {
    const price = plan?.monthlyPriceUsd;
    if (plan?.trialDays) return tr("plans.price.trial", "Free for {{count}} days", { count: plan.trialDays });
    if ((price === null || price === undefined) && !plan?.requestable) return tr("plans.price.agreed", "Agreed price");
    if (price === null || price === undefined) return tr("plans.price.ask", "Ask for the price");
    if (Number(price) === 0) return tr("plans.price.free", "Free");
    const amount = new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(Number(price));
    return tr("plans.price.monthly", "US${{amount}} / month", { amount });
  };

  const features = (plan) => [
    {
      ok: true,
      text: plan.maxUsers == null
        ? tr("plans.features.usersUnlimited", "Unlimited users")
        : tr("plans.features.users", "Up to {{count}} users", { count: plan.maxUsers }),
    },
    {
      ok: true,
      text: plan.maxProducts == null
        ? tr("plans.features.productsUnlimited", "Unlimited products")
        : tr("plans.features.products", "Up to {{count}} products", { count: plan.maxProducts }),
    },
    {
      ok: plan.allReports,
      text: plan.allReports
        ? tr("plans.features.allReports", "All reports")
        : tr("plans.features.basicReport", "Only the \"Orders by status\" report"),
      partial: !plan.allReports,
    },
    {
      ok: plan.webBookings,
      text: plan.webBookings
        ? tr("plans.features.webBookings", "Bookings from your online store")
        : tr("plans.features.managerBookings", "Bookings only from the manager"),
      partial: !plan.webBookings,
    },
    {
      ok: plan.aiAssistant,
      // AI questions per month: at most 10% of the plan price (2026-10-25, security S14).
      text: plan.aiAssistant && plan.aiInteractionsMonth != null
        ? tr("plans.features.aiInteractions", "AI assistant (Aleph): up to {{count}} questions / month", {
            count: Number(plan.aiInteractionsMonth),
          })
        : tr("plans.features.ai", "AI assistant (Aleph)"),
    },
    {
      ok: Number(plan.supportHoursMonth) > 0,
      text: Number(plan.supportHoursMonth) > 0
        ? tr("plans.features.support", "{{count}} hours of human support per month", { count: Number(plan.supportHoursMonth) })
        : tr("plans.features.noSupport", "Human support hours"),
    },
    {
      ok: true,
      text: plan.storageGb == null
        ? tr("plans.features.storageUnlimited", "Unlimited storage")
        : tr("plans.features.storage", "{{count}} GB of storage", { count: plan.storageGb }),
    },
    ...(plan.trialDays
      ? [{ ok: true, text: tr("plans.features.trial", "{{count}} days to try everything", { count: plan.trialDays }) }]
      : []),
  ];

  const openForm = (code) => {
    setForm((f) => ({ ...f, requestedPlan: code || f.requestedPlan || requestable[0]?.planCode || "" }));
    setFormError("");
    setView("form");
  };

  const update = (field) => (event) => {
    setFormError("");
    setForm((f) => ({ ...f, [field]: event.target.value }));
  };

  const submit = async (event) => {
    event.preventDefault();
    setFormError("");
    if (!form.requestedPlan) return setFormError(tr("plans.form.errors.plan", "Choose the plan you want."));
    if (!form.contactName.trim()) return setFormError(tr("plans.form.errors.name", "Please write your name."));
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.contactEmail.trim()))
      return setFormError(tr("plans.form.errors.email", "Please write a valid email."));
    if (!planCaptcha.ready)
      return setFormError(tr("plans.form.errors.captchaPending", "Please complete the security check above the button."));
    setSending(true);
    try {
      await sendPlanRequest(companyId, { ...form, language }, planCaptcha.token);
      setView("sent");
    } catch (err) {
      if (err?.response?.result?.code === "BASIC_COMPANY_REQUIRED") {
        setBasicMissingFromServer(err.response.result.missing || []);
        setView("plans");
      } else if (isCaptchaError(err?.response?.result?.code)) {
        setFormError(tr("plans.form.errors.captchaFailed", "The security check failed. Please complete it again and resend."));
      } else if (err?.status === 429) {
        setFormError(tr("plans.form.errors.tooMany", "You already sent several requests today. An agent will contact you soon."));
      } else if (err?.status === 400) {
        setFormError(err.message);
      } else {
        setFormError(tr("plans.form.errors.send", "The request could not be sent. Please try again."));
      }
    } finally {
      setSending(false);
      planCaptcha.reset(); // a CAPTCHA token works only once
    }
  };

  const formatDate = (value) => {
    if (!value) return "";
    try {
      return new Date(value).toLocaleDateString(locale, { year: "numeric", month: "short", day: "numeric" });
    } catch {
      return String(value);
    }
  };

  const usage = (count, max) => {
    const limited = max !== null && max !== undefined;
    const percent = limited && max > 0 ? Math.min(100, Math.round((count / max) * 100)) : 0;
    return { limited, percent, full: limited && count >= max };
  };

  const currentPlan = current?.plan || null;
  const active = current ? current.active !== false : true;
  const users = currentPlan && active ? usage(current.usersCount, currentPlan.maxUsers) : null;
  const products = currentPlan && active ? usage(current.productsCount, currentPlan.maxProducts) : null;
  // AI questions this month (null limit = unlimited; 0 = not included).
  const aiLimit = current?.aiInteractionsLimit;
  const ai = currentPlan && active && currentPlan.aiAssistant && aiLimit !== 0
    ? usage(Number(current.aiInteractionsUsed) || 0, aiLimit ?? null)
    : null;
  const toMB = (bytes) => Math.round((Number(bytes) || 0) / (1024 * 1024));
  const storageUse = storage && storage.limitBytes != null
    ? usage(Number(storage.usedBytes) || 0, Number(storage.limitBytes))
    : null;
  const storageText = () => {
    if (!storage) return "";
    const used = new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(toMB(storage.usedBytes));
    if (storage.limitBytes == null) return `${used} MB · ${tr("plans.usage.unlimited", "unlimited")}`;
    return `${used} MB / ${storage.storageGb} GB`;
  };

  return createPortal(
    <div className="plans-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="plans-modal-title" onClick={onClose}>
      <div className="plans-modal" onClick={(event) => event.stopPropagation()}>
        <div className="plans-modal__header">
          <h3 id="plans-modal-title">
            {view === "form" && (
              <button type="button" className="plans-modal__back" onClick={() => setView("plans")} aria-label={tr("plans.back", "Back to the plans")}>
                <FaArrowLeft />
              </button>
            )}
            <FaCrown /> {view === "form" ? tr("plans.form.title", "Request a plan") : tr("plans.title", "Your plan")}
          </h3>
          <button type="button" className="plans-modal__close" onClick={onClose} aria-label={tr("plans.close", "Close")}>
            <FaTimes />
          </button>
        </div>

        <div className="plans-modal__body">
          {loading && <p className="plans-modal__muted">{tr("plans.loading", "Loading plans…")}</p>}
          {!loading && error && <p className="plans-modal__error">{tr("plans.loadError", "The plans could not be loaded. Please try again.")}</p>}

          {!loading && !error && current && view === "plans" && (
            <>
              {reason && <p className="plans-modal__reason">{reason}</p>}

              <section className="plans-current">
                <div className="plans-current__head">
                  <div>
                    <small>{companyName || current.companyName}</small>
                    <strong>
                      {tr("plans.current.label", "Current plan")}: {planName(current.planCode)}
                    </strong>
                    {/* Price of this company: the agreed (negotiated) one, or the plan price. */}
                    {current.agreedPriceUsd != null ? (
                      <small className="plans-current__price">
                        {tr("plans.current.agreedPrice", "Your price: US${{amount}} / month (agreed price)", {
                          amount: new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(Number(current.agreedPriceUsd)),
                        })}
                      </small>
                    ) : Number(currentPlan?.monthlyPriceUsd) > 0 ? (
                      <small className="plans-current__price">
                        {tr("plans.current.price", "Your price: {{price}}", { price: priceText(currentPlan) })}
                      </small>
                    ) : null}
                  </div>
                  <span className={`plan-chip plan-chip--${String(current.planCode).toLowerCase()}`}>{planName(current.planCode)}</span>
                </div>

                {current.expired && (
                  <p className="plans-current__note plans-current__note--warn">
                    <FaRegClock />{" "}
                    {tr("plans.current.expired", "Your {{plan}} plan ended on {{date}}. The company is read-only until a plan is assigned.", {
                      plan: planName(current.assignedPlan),
                      date: formatDate(current.endsAt),
                    })}
                  </p>
                )}
                {!active && !current.expired && (
                  <p className="plans-current__note plans-current__note--warn">
                    <FaRegClock />{" "}
                    {tr("plans.current.none", "Your company has no active plan, so it is read-only. Choose a plan or request a free trial.")}
                  </p>
                )}
                {!current.expired && current.endsAt && (
                  <p className="plans-current__note">
                    <FaRegClock />{" "}
                    {tr("plans.current.endsIn", "{{count}} days left (until {{date}}).", {
                      count: current.daysLeft ?? 0,
                      date: formatDate(current.endsAt),
                    })}
                  </p>
                )}

                <div className="plans-usage">
                  <div className={`plans-usage__item ${users?.full ? "is-full" : ""}`}>
                    <span>
                      {tr("plans.usage.users", "Active users")}: <strong>{current.usersCount}</strong>
                      {users?.limited ? ` / ${currentPlan.maxUsers}` : ` · ${tr("plans.usage.unlimited", "unlimited")}`}
                    </span>
                    {users?.limited && <div className="plans-usage__bar"><i style={{ width: `${users.percent}%` }} /></div>}
                  </div>
                  <div className={`plans-usage__item ${products?.full ? "is-full" : ""}`}>
                    <span>
                      {tr("plans.usage.products", "Products")}: <strong>{current.productsCount}</strong>
                      {products?.limited ? ` / ${currentPlan.maxProducts}` : ` · ${tr("plans.usage.unlimited", "unlimited")}`}
                    </span>
                    {products?.limited && <div className="plans-usage__bar"><i style={{ width: `${products.percent}%` }} /></div>}
                  </div>
                  {ai && (
                    <div className={`plans-usage__item ${ai.full ? "is-full" : ""}`}>
                      <span>
                        {tr("plans.usage.aiQuestions", "AI questions this month")}: <strong>{Number(current.aiInteractionsUsed) || 0}</strong>
                        {ai.limited ? ` / ${aiLimit}` : ` · ${tr("plans.usage.unlimited", "unlimited")}`}
                      </span>
                      {ai.limited && <div className="plans-usage__bar"><i style={{ width: `${ai.percent}%` }} /></div>}
                    </div>
                  )}
                  {storage && active && (
                    <div className={`plans-usage__item ${storageUse?.full ? "is-full" : ""}`}>
                      <span>
                        {tr("plans.usage.storage", "Storage")}: <strong>{storageText()}</strong>
                      </span>
                      {storageUse?.limited && <div className="plans-usage__bar"><i style={{ width: `${storageUse.percent}%` }} /></div>}
                    </div>
                  )}
                </div>

                {data?.pendingRequest && (
                  <p className="plans-current__note plans-current__note--info">
                    <FaPaperPlane />{" "}
                    {tr("plans.current.pending", "You requested the {{plan}} plan on {{date}}. An agent will contact you soon.", {
                      plan: planName(data.pendingRequest.requestedPlan),
                      date: formatDate(data.pendingRequest.createdAt),
                    })}
                  </p>
                )}
              </section>

              {needsBasicCompany && (
                <div className="plans-basic-company" role="status">
                  <FaBuilding aria-hidden="true" />
                  <div>
                    <strong>{tr("plans.basicCompany.title", "First create your basic company")}</strong>
                    <p>
                      {tr("plans.basicCompany.text", "Before requesting a plan, set up your company's name, logo and header in Company page. You can do it without a plan.")}
                    </p>
                    <p className="plans-basic-company__missing">
                      {tr("plans.basicCompany.missing", "Missing:")}{" "}
                      {basicMissing.map((field) => tr(`plans.basicCompany.fields.${field}`, field)).join(", ")}
                    </p>
                    <a className="plans-basic-company__link" href="/shao/page-configuration" onClick={() => onClose?.()}>
                      {tr("plans.basicCompany.go", "Go to Company page")}
                    </a>
                  </div>
                </div>
              )}

              <div className="plans-grid">
                {plans.map((plan) => {
                  const isCurrent = plan.planCode === current.planCode;
                  return (
                    <article key={plan.planCode} className={`plan-card ${isCurrent ? "is-current" : ""}`}>
                      {isCurrent && <span className="plan-card__ribbon">{tr("plans.current.badge", "Current")}</span>}
                      <h4>{planName(plan.planCode)}</h4>
                      <p className="plan-card__price">{priceText(plan)}</p>
                      <ul>
                        {features(plan).map((feature) => (
                          <li key={feature.text} className={feature.ok ? "is-ok" : feature.partial ? "is-partial" : "is-no"}>
                            {feature.ok ? <FaCheck aria-hidden="true" /> : <FaTimes aria-hidden="true" />}
                            <span>{feature.text}</span>
                          </li>
                        ))}
                      </ul>
                      {plan.requestable && !isCurrent && !needsBasicCompany && (
                        <button type="button" className="plan-card__button" onClick={() => openForm(plan.planCode)}>
                          {plan.trialDays ? tr("plans.requestTrial", "Request the trial") : tr("plans.request", "Request this plan")}
                        </button>
                      )}
                    </article>
                  );
                })}
              </div>

              <p className="plans-modal__muted plans-modal__foot">
                {tr("plans.paymentNote", "Online payments are coming soon. After your request an agent will contact you with the next steps.")}
              </p>
              <p className="plans-modal__muted plans-modal__foot">
                {tr("plans.aiNote", "AI questions per month: the AI assistant of each plan uses at most {{percent}}% of the plan price. One question = one message to Aleph or to your store assistant. They reset on the 1st of each month.", {
                  percent: current?.aiBudgetPercent || 10,
                })}
              </p>
            </>
          )}

          {!loading && !error && view === "form" && (
            <form className="plans-form" onSubmit={submit} noValidate>
              <p className="plans-modal__muted">
                {tr("plans.form.intro", "Tell us about you and the plan you want. An agent will contact you soon.")}
              </p>

              <label>
                {tr("plans.form.plan", "Plan")}
                <select value={form.requestedPlan} onChange={update("requestedPlan")}>
                  <option value="">{tr("plans.form.choosePlan", "Choose a plan")}</option>
                  {requestable.map((plan) => (
                    <option key={plan.planCode} value={plan.planCode}>
                      {planName(plan.planCode)} — {priceText(plan)}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                {tr("plans.form.name", "Your name")}
                <input type="text" value={form.contactName} onChange={update("contactName")} maxLength={150} autoComplete="name" />
              </label>
              <div className="plans-form__row">
                <label>
                  {tr("plans.form.email", "Email")}
                  <input type="email" value={form.contactEmail} onChange={update("contactEmail")} maxLength={200} autoComplete="email" />
                </label>
                <label>
                  {tr("plans.form.phone", "Phone / WhatsApp")}
                  <input type="tel" value={form.contactPhone} onChange={update("contactPhone")} maxLength={40} autoComplete="tel" />
                </label>
              </div>
              <label>
                {tr("plans.form.message", "Message (optional)")}
                <textarea
                  rows={3}
                  value={form.message}
                  onChange={update("message")}
                  maxLength={1000}
                  placeholder={tr("plans.form.messagePlaceholder", "For example: how many users you need, or the best time to call you.")}
                />
              </label>

              <CaptchaWidget captcha={planCaptcha} language={language} />
              {formError && <p className="plans-modal__error" role="alert">{formError}</p>}

              <div className="plans-form__actions">
                <button type="button" className="plans-form__secondary" onClick={() => setView("plans")}>
                  {tr("plans.form.cancel", "Cancel")}
                </button>
                <button type="submit" className="plans-form__primary" disabled={sending}>
                  <FaPaperPlane /> {sending ? tr("plans.form.sending", "Sending…") : tr("plans.form.send", "Send request")}
                </button>
              </div>
            </form>
          )}

          {view === "sent" && (
            <div className="plans-sent">
              <FaCheckCircle aria-hidden="true" />
              <h4>{tr("plans.sent.title", "Request sent")}</h4>
              <p>
                {tr("plans.sent.text", "Thank you! An agent will contact you soon about the {{plan}} plan.", {
                  plan: planName(form.requestedPlan),
                })}
              </p>
              <button type="button" className="plans-form__primary" onClick={onClose}>
                {tr("plans.close", "Close")}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
