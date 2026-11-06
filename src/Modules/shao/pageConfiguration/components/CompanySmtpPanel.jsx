import React, { useEffect, useState } from "react";
import {
  FaCheck,
  FaExclamationTriangle,
  FaPaperPlane,
  FaSave,
  FaServer,
  FaTimes,
} from "react-icons/fa";

import CompanySmtpService from "../services/CompanySmtpService";
import planLimitMessage from "../../../../Shared/Utils/planLimitMessage";

const companySmtpService = new CompanySmtpService();

// Typical ports for each security mode.
const DEFAULT_PORTS = { STARTTLS: 587, SSL: 465 };

const EMPTY_SMTP = {
  host: "",
  port: 587,
  security: "STARTTLS",
  username: "",
  password: "",
  fromEmail: "",
  fromName: "",
  enabled: true,
};

function toFormState(result) {
  return {
    host: result?.host || "",
    port: result?.port || 587,
    security: result?.security || "STARTTLS",
    username: result?.username || "",
    password: "", // never returned by the server
    fromEmail: result?.fromEmail || "",
    fromName: result?.fromName || "",
    enabled: result?.configured ? Boolean(result?.enabled) : true,
  };
}

/**
 * The company's own email server (SMTP). Notifications to customers and to
 * the company are sent from this account. The password is write-only: the
 * server never returns it, and an empty field keeps the saved one.
 */
export default function CompanySmtpPanel({ t, companyId, defaultTestTo = "", defaultFromName = "", onClose, onStatusChange }) {
  const [smtp, setSmtp] = useState(EMPTY_SMTP);
  const [info, setInfo] = useState(null); // last server answer (hasPassword, last test…)
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testTo, setTestTo] = useState(defaultTestTo);
  const [message, setMessage] = useState({ type: "", text: "" });

  useEffect(() => {
    setTestTo(defaultTestTo);
  }, [defaultTestTo]);

  useEffect(() => {
    if (!companyId) {
      setLoading(false);
      return undefined;
    }
    const controller = new AbortController();

    companySmtpService
      .selectSmtp({ companyId, signal: controller.signal })
      .then((result) => {
        setInfo(result);
        const form = toFormState(result);
        if (!result?.configured && defaultFromName) form.fromName = defaultFromName;
        setSmtp(form);
        onStatusChange?.(result);
      })
      .catch((error) => {
        if (error?.name === "AbortError") return;
        console.error("[CompanySmtpPanel] Load failed:", error);
        setMessage({ type: "error", text: t("pageConfiguration.smtp.loadError") });
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId, t]);

  const updateField = (event) => {
    const { name, value, type, checked } = event.target;
    setMessage({ type: "", text: "" });
    setSmtp((current) => {
      const next = { ...current, [name]: type === "checkbox" ? checked : value };
      // Changing the security mode suggests its usual port.
      if (name === "security" && DEFAULT_PORTS[value] &&
          Object.values(DEFAULT_PORTS).includes(Number(current.port))) {
        next.port = DEFAULT_PORTS[value];
      }
      return next;
    });
  };

  const saveSmtp = async () => {
    if (saving) return;
    setSaving(true);
    setMessage({ type: "", text: "" });
    try {
      const result = await companySmtpService.saveSmtp({ companyId, smtp });
      setInfo(result);
      setSmtp(toFormState(result));
      onStatusChange?.(result);
      setMessage({ type: "success", text: t("pageConfiguration.smtp.saved") });
    } catch (error) {
      // No active plan (2026-10-29): clear "join a plan" message.
      setMessage({ type: "error", text: planLimitMessage(error, t) || error?.message || t("pageConfiguration.smtp.saveError") });
    } finally {
      setSaving(false);
    }
  };

  const sendTest = async () => {
    if (testing) return;
    setTesting(true);
    setMessage({ type: "", text: "" });
    try {
      const result = await companySmtpService.testSmtp({ companyId, to: testTo });
      setInfo((current) => ({
        ...current,
        lastTestAt: result?.testedAt,
        lastTestOk: result?.ok,
        lastTestError: result?.error || null,
      }));
      if (result?.ok) {
        setMessage({ type: "success", text: t("pageConfiguration.smtp.testOk", { to: result.sentTo }) });
      } else {
        setMessage({ type: "error", text: t("pageConfiguration.smtp.testFailed", { error: result?.error || "" }) });
      }
    } catch (error) {
      setMessage({ type: "error", text: planLimitMessage(error, t) || error?.message || t("pageConfiguration.smtp.testFailed", { error: "" }) });
    } finally {
      setTesting(false);
    }
  };

  const busy = saving || testing;
  const configured = Boolean(info?.configured);

  return (
    <section className="company-smtp" aria-labelledby="company-smtp-title">
      <div className="company-smtp__heading">
        <span className="company-smtp__icon"><FaServer /></span>
        <div>
          <h2 id="company-smtp-title">{t("pageConfiguration.smtp.title")}</h2>
          <p>{t("pageConfiguration.smtp.description")}</p>
        </div>
        {onClose && (
          <button type="button" className="company-smtp__close" onClick={onClose} aria-label={t("pageConfiguration.smtp.close")}>
            <FaTimes />
          </button>
        )}
      </div>

      {loading ? (
        <div className="company-smtp__loading" role="status">{t("pageConfiguration.loading")}</div>
      ) : (
        <>
          <div className={`company-smtp__status ${configured && info?.enabled ? "is-ok" : "is-off"}`}>
            {configured && info?.enabled ? <FaCheck /> : <FaExclamationTriangle />}
            <span>
              {!configured
                ? t("pageConfiguration.smtp.notConfigured")
                : info?.enabled
                  ? t("pageConfiguration.smtp.configured")
                  : t("pageConfiguration.smtp.disabled")}
            </span>
          </div>

          <div className="company-smtp__grid">
            <label>
              <span>{t("pageConfiguration.smtp.fields.host")}</span>
              <input name="host" value={smtp.host} onChange={updateField} placeholder="smtp.gmail.com" autoComplete="off" disabled={busy} />
            </label>
            <label>
              <span>{t("pageConfiguration.smtp.fields.security")}</span>
              <select name="security" value={smtp.security} onChange={updateField} disabled={busy}>
                <option value="STARTTLS">{t("pageConfiguration.smtp.securityStarttls")}</option>
                <option value="SSL">{t("pageConfiguration.smtp.securitySsl")}</option>
              </select>
            </label>
            <label>
              <span>{t("pageConfiguration.smtp.fields.port")}</span>
              <input name="port" type="number" min="1" max="65535" value={smtp.port} onChange={updateField} disabled={busy} />
            </label>
            <label>
              <span>{t("pageConfiguration.smtp.fields.username")}</span>
              <input name="username" value={smtp.username} onChange={updateField} placeholder="orders@yourcompany.com" autoComplete="off" disabled={busy} />
            </label>
            <label>
              <span>{t("pageConfiguration.smtp.fields.password")}</span>
              <input
                name="password"
                type="password"
                value={smtp.password}
                onChange={updateField}
                autoComplete="new-password"
                placeholder={info?.hasPassword ? "••••••••" : ""}
                disabled={busy}
              />
              {info?.hasPassword && <small>{t("pageConfiguration.smtp.passwordSaved")}</small>}
            </label>
            <label>
              <span>{t("pageConfiguration.smtp.fields.fromEmail")}</span>
              <input name="fromEmail" type="email" value={smtp.fromEmail} onChange={updateField} placeholder="orders@yourcompany.com" disabled={busy} />
            </label>
            <label>
              <span>{t("pageConfiguration.smtp.fields.fromName")}</span>
              <input name="fromName" value={smtp.fromName} onChange={updateField} maxLength={120} disabled={busy} />
            </label>
            <label className="company-smtp__check">
              <input name="enabled" type="checkbox" checked={smtp.enabled} onChange={updateField} disabled={busy} />
              <span>{t("pageConfiguration.smtp.fields.enabled")}</span>
            </label>
          </div>

          <small className="company-smtp__help">{t("pageConfiguration.smtp.help")}</small>

          <div className="company-smtp__actions">
            <button type="button" className="company-smtp__save" onClick={saveSmtp} disabled={busy}>
              <FaSave /> {saving ? t("pageConfiguration.smtp.saving") : t("pageConfiguration.smtp.save")}
            </button>
          </div>

          <div className="company-smtp__test">
            <label>
              <span>{t("pageConfiguration.smtp.testTo")}</span>
              <input type="email" value={testTo} onChange={(event) => setTestTo(event.target.value)} placeholder="name@example.com" disabled={busy || !configured} />
            </label>
            <button type="button" onClick={sendTest} disabled={busy || !configured}>
              <FaPaperPlane /> {testing ? t("pageConfiguration.smtp.testing") : t("pageConfiguration.smtp.test")}
            </button>
          </div>

          {info?.lastTestAt && (
            <small className="company-smtp__last-test">
              {t("pageConfiguration.smtp.lastTest", {
                date: new Date(info.lastTestAt).toLocaleString(),
                result: info.lastTestOk ? t("pageConfiguration.smtp.ok") : t("pageConfiguration.smtp.failed"),
              })}
            </small>
          )}

          {message.text && (
            <div className={message.type === "error" ? "page-configuration__error" : "page-configuration__success"} role="status">
              {message.type === "success" && <FaCheck />} {message.text}
            </div>
          )}
        </>
      )}
    </section>
  );
}
