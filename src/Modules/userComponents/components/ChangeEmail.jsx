import React, { useEffect, useMemo, useState } from "react";
import {
  FaEnvelope,
  FaEye,
  FaEyeSlash,
  FaSave,
  FaLock,
} from "react-icons/fa";

import { toast } from "react-toastify";

import "./ChangeEmail.scss";
import ChangeEmailService from "../services/ChangeEmailService";
import CanChangeFirebasePasswordService from "../services/CanChangeFirebasePasswordService";

export default function ChangeEmail(props) {
  const { t, setRefreshChecklogin } = props;

  const changeEmailService = useMemo(() => new ChangeEmailService(), []);

  const canChangeFirebasePasswordService = useMemo(
    () => new CanChangeFirebasePasswordService(),
    []
  );

  const [formData, setFormData] = useState({
    currentEmail: "",
    newEmail: "",
    password: "",
  });

  const [showPassword, setShowPassword] = useState(false);

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [checkingProvider, setCheckingProvider] = useState(true);

  const [canChangeEmail, setCanChangeEmail] = useState(false);
  const [providerInfo, setProviderInfo] = useState({
    providers: [],
    providerType: "unknown",
    message: "",
  });

  const tr = (key, fallback) => {
    try {
      return typeof t === "function" ? t(key) || fallback : fallback;
    } catch {
      return fallback;
    }
  };

  const getProviderLabel = (providers = []) => {
    const provider = providers[0] || "external";

    const map = {
      "google.com": "Google",
      "apple.com": "Apple",
      "facebook.com": "Facebook",
      "microsoft.com": "Microsoft",
      "github.com": "GitHub",
      password: "Email / Password",
    };

    return map[provider] || provider;
  };

  const validateCanChangeEmail = async ({ showToast = true } = {}) => {
    try {
      setCheckingProvider(true);

      const result =
        await canChangeFirebasePasswordService.canChangePassword();

      const allowed = Boolean(result?.canChange);

      setCanChangeEmail(allowed);

      setProviderInfo({
        providers: result?.providers || [],
        providerType: result?.providerType || "unknown",
        message: result?.message || "",
      });

      if (!allowed && showToast) {
        const providerLabel = getProviderLabel(result?.providers || []);

        toast.warning(
          tr(
            "changeEmail.onlyEmailUsers",
            `Email change is only available for email/password users. This account uses ${providerLabel}.`
          )
        );
      }

      return allowed;
    } catch (error) {
      console.error("Error validating email provider:", error);

      setCanChangeEmail(false);

      if (showToast) {
        toast.error(
          error.message ||
            tr(
              "changeEmail.errors.providerValidation",
              "Error validating account provider."
            )
        );
      }

      return false;
    } finally {
      setCheckingProvider(false);
    }
  };

  useEffect(() => {
    validateCanChangeEmail({ showToast: true });

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateField = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));

    setErrors((prev) => ({
      ...prev,
      [field]: "",
      general: "",
    }));
  };

  const validateEmail = (email) => {
    return /\S+@\S+\.\S+/.test(email);
  };

  const validate = () => {
    const newErrors = {};

    const currentEmail = formData.currentEmail.trim().toLowerCase();
    const newEmail = formData.newEmail.trim().toLowerCase();
    const password = formData.password.trim();

    if (!canChangeEmail) {
      newErrors.general = tr(
        "changeEmail.onlyEmailUsers",
        "Email change is only available for email/password users."
      );
    }

    if (!currentEmail) {
      newErrors.currentEmail = tr(
        "changeEmail.errors.currentEmail",
        "Current email is required"
      );
    } else if (!validateEmail(currentEmail)) {
      newErrors.currentEmail = tr(
        "changeEmail.errors.invalidEmail",
        "Please enter a valid email"
      );
    }

    if (!newEmail) {
      newErrors.newEmail = tr(
        "changeEmail.errors.newEmail",
        "New email is required"
      );
    } else if (!validateEmail(newEmail)) {
      newErrors.newEmail = tr(
        "changeEmail.errors.invalidEmail",
        "Please enter a valid email"
      );
    }

    if (currentEmail && newEmail && currentEmail === newEmail) {
      newErrors.newEmail = tr(
        "changeEmail.errors.sameEmail",
        "The new email must be different from the current email"
      );
    }

    if (!password) {
      newErrors.password = tr(
        "changeEmail.errors.password",
        "Password is required"
      );
    }

    setErrors(newErrors);

    return Object.keys(newErrors).length === 0;
  };

  const handleChangeEmail = async () => {
    const allowed = await validateCanChangeEmail({ showToast: true });

    if (!allowed) {
      setErrors({
        general: tr(
          "changeEmail.onlyEmailUsers",
          "Email change is only available for email/password users."
        ),
      });
      return;
    }

    if (!validate()) return;

    try {
      setLoading(true);

      const result = await changeEmailService.changeEmail({
        currentEmail: formData.currentEmail.trim().toLowerCase(),
        newEmail: formData.newEmail.trim().toLowerCase(),
        password: formData.password,
      });

      toast.success(
        result?.message ||
          tr("changeEmail.success", "Email changed successfully")
      );

      setFormData({
        currentEmail: "",
        newEmail: "",
        password: "",
      });

      if (typeof setRefreshChecklogin === "function") {
        setRefreshChecklogin((prev) => !prev);
      }
    } catch (error) {
      console.error("Error changing email:", error);

      const message =
        error.message ||
        tr("changeEmail.errors.general", "Error changing email");

      toast.error(message);

      setErrors({
        general: message,
      });
    } finally {
      setLoading(false);
    }
  };

  const providerLabel = getProviderLabel(providerInfo.providers);

  return (
    <section className="change-email">
      <div className="change-email__wrapper">
        <div className="change-email__header">
          <span className="change-email__eyebrow">
            <FaEnvelope />
            {tr("changeEmail.section", "Account")}
          </span>

          <h2>{tr("changeEmail.title", "Change email")}</h2>

          <p>
            {tr(
              "changeEmail.subtitle",
              "Update the email associated with your account."
            )}
          </p>
        </div>

        <div className="change-email__card">
          {checkingProvider ? (
            <div className="change-email__general-error">
              {tr(
                "changeEmail.checkingProvider",
                "Checking account provider..."
              )}
            </div>
          ) : !canChangeEmail ? (
            <div className="change-email__general-error">
              {tr(
                "changeEmail.onlyEmailUsers",
                `Email change is only available for email/password users. This account uses ${providerLabel}.`
              )}
            </div>
          ) : null}

          <div className="change-email-field">
            <label>
              <FaEnvelope />
              {tr("changeEmail.currentEmail", "Current email")}
            </label>

            <input
              type="email"
              value={formData.currentEmail}
              onChange={(e) =>
                updateField("currentEmail", e.target.value)
              }
              placeholder={tr(
                "changeEmail.currentEmailPlaceholder",
                "Enter your current email"
              )}
              disabled={!canChangeEmail || checkingProvider || loading}
            />

            {errors.currentEmail && (
              <span className="change-email-field__error">
                {errors.currentEmail}
              </span>
            )}
          </div>

          <div className="change-email-field">
            <label>
              <FaEnvelope />
              {tr("changeEmail.newEmail", "New email")}
            </label>

            <input
              type="email"
              value={formData.newEmail}
              onChange={(e) =>
                updateField("newEmail", e.target.value)
              }
              placeholder={tr(
                "changeEmail.newEmailPlaceholder",
                "Enter your new email"
              )}
              disabled={!canChangeEmail || checkingProvider || loading}
            />

            {errors.newEmail && (
              <span className="change-email-field__error">
                {errors.newEmail}
              </span>
            )}
          </div>

          <div className="change-email-field">
            <label>
              <FaLock />
              {tr("changeEmail.password", "Password")}
            </label>

            <div className="change-email-field__input-wrapper">
              <input
                type={showPassword ? "text" : "password"}
                value={formData.password}
                onChange={(e) =>
                  updateField("password", e.target.value)
                }
                placeholder={tr(
                  "changeEmail.passwordPlaceholder",
                  "Enter your password"
                )}
                disabled={!canChangeEmail || checkingProvider || loading}
              />

              <button
                type="button"
                className="change-email-field__toggle"
                onClick={() => setShowPassword((prev) => !prev)}
                disabled={!canChangeEmail || checkingProvider || loading}
              >
                {showPassword ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>

            {errors.password && (
              <span className="change-email-field__error">
                {errors.password}
              </span>
            )}
          </div>

          {errors.general && (
            <div className="change-email__general-error">
              {errors.general}
            </div>
          )}

          <div className="change-email__actions">
            <button
              type="button"
              className="change-email__button"
              onClick={handleChangeEmail}
              disabled={loading || checkingProvider || !canChangeEmail}
            >
              <FaSave />

              {loading
                ? tr("changeEmail.saving", "Saving...")
                : tr("changeEmail.save", "Save")}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}