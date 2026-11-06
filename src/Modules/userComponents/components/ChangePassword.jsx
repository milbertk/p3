import React, { useEffect, useMemo, useState } from "react";
import {
  FaKey,
  FaLock,
  FaEye,
  FaEyeSlash,
  FaSave,
} from "react-icons/fa";
import { toast } from "react-toastify";

import "./ChangePassword.scss";
import CanChangeFirebasePasswordService from "../services/CanChangeFirebasePasswordService";
import ChangePasswordService from "../services/ChangePasswordService";



export default function ChangePassword(props) {
  const { t, setRefreshChecklogin } = props;

  const canChangeFirebasePasswordService = useMemo(
    () => new CanChangeFirebasePasswordService(),
    []
  );

  const changePasswordService = useMemo(
    () => new ChangePasswordService(),
    []
  );

  const [formData, setFormData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [showPassword, setShowPassword] = useState({
    currentPassword: false,
    newPassword: false,
    confirmPassword: false,
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [checkingProvider, setCheckingProvider] = useState(true);

  const [canChangePassword, setCanChangePassword] = useState(false);
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

  const validateCanChangePassword = async ({ showToast = true } = {}) => {
    try {
      setCheckingProvider(true);

      const result =
        await canChangeFirebasePasswordService.canChangePassword();

      const allowed = Boolean(result?.canChange);

      setCanChangePassword(allowed);
      setProviderInfo({
        providers: result?.providers || [],
        providerType: result?.providerType || "unknown",
        message: result?.message || "",
      });

      if (!allowed && showToast) {
        const providerLabel = getProviderLabel(result?.providers || []);

        toast.warning(
          tr(
            "changePassword.onlyEmailUsers",
            `Password change is only available for email/password users. This account uses ${providerLabel}.`
          )
        );
      }

      return allowed;
    } catch (error) {
      console.error("Error validating password provider:", error);

      setCanChangePassword(false);

      if (showToast) {
        toast.error(
          error.message ||
            tr(
              "changePassword.errors.providerValidation",
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
    validateCanChangePassword({ showToast: true });

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

  const togglePassword = (field) => {
    setShowPassword((prev) => ({
      ...prev,
      [field]: !prev[field],
    }));
  };

  const validate = () => {
    const newErrors = {};

    if (!canChangePassword) {
      newErrors.general = tr(
        "changePassword.onlyEmailUsers",
        "Password change is only available for email/password users."
      );
    }

    if (!formData.currentPassword.trim()) {
      newErrors.currentPassword = tr(
        "changePassword.errors.currentPassword",
        "Current password is required"
      );
    }

    if (!formData.newPassword.trim()) {
      newErrors.newPassword = tr(
        "changePassword.errors.newPassword",
        "New password is required"
      );
    } else if (formData.newPassword.length < 8) {
      newErrors.newPassword = tr(
        "changePassword.errors.minLength",
        "Password must have at least 8 characters"
      );
    }

    if (!formData.confirmPassword.trim()) {
      newErrors.confirmPassword = tr(
        "changePassword.errors.confirmPassword",
        "Confirm password is required"
      );
    } else if (formData.newPassword !== formData.confirmPassword) {
      newErrors.confirmPassword = tr(
        "changePassword.errors.passwordMismatch",
        "Passwords do not match"
      );
    }

    if (
      formData.currentPassword &&
      formData.newPassword &&
      formData.currentPassword === formData.newPassword
    ) {
      newErrors.newPassword = tr(
        "changePassword.errors.samePassword",
        "The new password must be different from the current password"
      );
    }

    setErrors(newErrors);

    return Object.keys(newErrors).length === 0;
  };

  const handleChangePassword = async () => {
    const allowed = await validateCanChangePassword({ showToast: true });

    if (!allowed) {
      setErrors({
        general: tr(
          "changePassword.onlyEmailUsers",
          "Password change is only available for email/password users."
        ),
      });
      return;
    }

    if (!validate()) return;

    try {
      setLoading(true);

      const result = await changePasswordService.changePassword({
        currentPassword: formData.currentPassword,
        newPassword: formData.newPassword,
        confirmPassword: formData.confirmPassword,
      });

      toast.success(
        result?.message ||
          tr("changePassword.success", "Password changed successfully")
      );

      setFormData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });

      if (typeof setRefreshChecklogin === "function") {
        setRefreshChecklogin((prev) => !prev);
      }
    } catch (error) {
      console.error("Error changing password:", error);

      toast.error(
        error.message ||
          tr("changePassword.errors.general", "Error changing password")
      );

      setErrors({
        general:
          error.message ||
          tr("changePassword.errors.general", "Error changing password"),
      });
    } finally {
      setLoading(false);
    }
  };

  const renderPasswordField = (field, label, placeholder) => (
    <div className="change-password-field">
      <label>
        <FaLock />
        {label}
      </label>

      <div className="change-password-field__input-wrapper">
        <input
          type={showPassword[field] ? "text" : "password"}
          value={formData[field]}
          onChange={(e) => updateField(field, e.target.value)}
          placeholder={placeholder}
          disabled={!canChangePassword || checkingProvider || loading}
        />

        <button
          type="button"
          onClick={() => togglePassword(field)}
          className="change-password-field__toggle"
          disabled={!canChangePassword || checkingProvider || loading}
        >
          {showPassword[field] ? <FaEyeSlash /> : <FaEye />}
        </button>
      </div>

      {errors[field] && (
        <span className="change-password-field__error">
          {errors[field]}
        </span>
      )}
    </div>
  );

  const providerLabel = getProviderLabel(providerInfo.providers);

  return (
    <section className="change-password">
      <div className="change-password__header">
        <span className="change-password__eyebrow">
          <FaKey />
          {tr("changePassword.section", "Security")}
        </span>

        <h2>{tr("changePassword.title", "Change password")}</h2>

        <p>
          {tr(
            "changePassword.subtitle",
            "Update your account password."
          )}
        </p>
      </div>

      <div className="change-password__card">
        {checkingProvider ? (
          <div className="change-password__general-error">
            {tr(
              "changePassword.checkingProvider",
              "Checking account provider..."
            )}
          </div>
        ) : !canChangePassword ? (
          <div className="change-password__general-error">
            {tr(
              "changePassword.onlyEmailUsers",
              `Password change is only available for email/password users. This account uses ${providerLabel}.`
            )}
          </div>
        ) : null}

        {renderPasswordField(
          "currentPassword",
          tr("changePassword.currentPassword", "Current password"),
          tr(
            "changePassword.currentPasswordPlaceholder",
            "Enter your current password"
          )
        )}

        {renderPasswordField(
          "newPassword",
          tr("changePassword.newPassword", "New password"),
          tr(
            "changePassword.newPasswordPlaceholder",
            "Enter your new password"
          )
        )}

        {renderPasswordField(
          "confirmPassword",
          tr("changePassword.confirmPassword", "Confirm password"),
          tr(
            "changePassword.confirmPasswordPlaceholder",
            "Confirm your new password"
          )
        )}

        {errors.general && (
          <div className="change-password__general-error">
            {errors.general}
          </div>
        )}

        <div className="change-password__actions">
          <button
            type="button"
            className="change-password__button"
            onClick={handleChangePassword}
            disabled={loading || checkingProvider || !canChangePassword}
          >
            <FaSave />

            {loading
              ? tr("changePassword.saving", "Saving...")
              : tr("changePassword.save", "Save")}
          </button>
        </div>
      </div>
    </section>
  );
}