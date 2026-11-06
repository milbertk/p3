import React, { useState } from "react";
import { toast } from "react-toastify";
import { sendEmailVerification } from "firebase/auth";
import { auth } from "../../../Shared/firebase/firebase";
import { FaUserPlus, FaShieldAlt, FaEnvelope } from "react-icons/fa";

import "./Register_Component.scss";
import CreateUserService from "../Services/CreateUserService";
import RegisterFirebaseService from "../Services/registerFirebaseService";

function Register_Component(props) {
  const { t } = props;

  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  const [rpass, setRpass] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (type, value) => {
    if (type === "user") setUser(value);
    if (type === "pass") setPass(value);
    if (type === "rpass") setRpass(value);
  };

  // ---- Translation helper with fallbacks ----------------------
  const tr = (key, fallback) => {
    try {
      const value = typeof t === "function" ? t(key) : null;
      return value && value !== key ? value : fallback;
    } catch {
      return fallback;
    }
  };

  // ---- Map common Firebase error codes to user-friendly text -
  const friendlyFirebaseError = (error) => {
    const code = error?.code || "";

    switch (code) {
      case "auth/email-already-in-use":
        return tr(
          "login.emailAlreadyInUse",
          "This email is already registered, please check login with Google or social networks."
        );
      case "auth/invalid-email":
        return tr("login.invalidEmail", "The email address is not valid.");
      case "auth/weak-password":
        return tr(
          "login.weakPassword",
          "Password is too weak. Use at least 6 characters."
        );
      case "auth/operation-not-allowed":
        return tr(
          "login.operationNotAllowed",
          "Email/password sign-up is currently disabled."
        );
      default:
        return error?.message || tr("login.registerError", "Could not register.");
    }
  };

  // ---- Client-side validation --------------------------------
  const validate = () => {
    const email = user.trim();

    if (!email || !pass || !rpass) {
      toast.error(tr("login.allFieldsRequired", "All fields are required."));
      return false;
    }

    const emailOk = /\S+@\S+\.\S+/.test(email);
    if (!emailOk) {
      toast.error(tr("login.invalidEmail", "The email address is not valid."));
      return false;
    }

    if (pass.length < 6) {
      toast.error(
        tr(
          "login.passwordTooShort",
          "Password must be at least 6 characters."
        )
      );
      return false;
    }

    if (pass !== rpass) {
      toast.error(
        tr("login.passwordsDoNotMatch", "Passwords do not match.")
      );
      return false;
    }

    return true;
  };

  // ---- Submit handler ----------------------------------------
  const handleRegister = async (e) => {
    e?.preventDefault?.();

    if (submitting) return;
    if (!validate()) return;

    const email = user.trim();
    const firebaseService = new RegisterFirebaseService();
    const userService = new CreateUserService();

    try {
      setSubmitting(true);

      // 1) Create user in Firebase
      const { user: firebaseUser, idToken } = await firebaseService.registerWithEmailAndPassword(
        email,
        pass
      );

      // 2) If Firebase succeeded, create the local user in our backend
      try {
        await userService.createUserFromFirebaseToken(idToken);
      } catch (backendErr) {
        console.error("Backend createUser error:", backendErr);
        toast.error(
          backendErr?.message ||
            tr(
              "login.backendCreateUserError",
              "Account created in Firebase but failed to register in our system."
            )
        );
        setSubmitting(false);
        return;
      }

      // 3) Send the verification email right away (2026-10-29). Before, it was only sent
      //    when the user pressed "Resend" on the verify screen.
      try {
        auth.languageCode = (navigator.language || "en").split("-")[0];
        await sendEmailVerification(firebaseUser);
        toast.info(
          tr(
            "login.verificationSent",
            "We sent you a verification email. Open it and click the link, then sign in."
          )
        );
      } catch (verifyErr) {
        // Not blocking: the user can resend it from the verify screen.
        console.warn("sendEmailVerification after register failed:", verifyErr);
      }

      // 4) Success — toast and redirect to login
      toast.success(
        tr("login.registerSuccess", "Account created successfully.")
      );

      setTimeout(() => {
        window.location.href = "/";
      }, 2500);
    } catch (firebaseErr) {
      console.error("Firebase register error:", firebaseErr);
      toast.error(friendlyFirebaseError(firebaseErr));
      setSubmitting(false);
    }
  };

  return (
    <div className="register-design">
      <section className="register-design__visual">
        <div className="register-design__visual-content">
          <span className="register-design__badge">
            <FaShieldAlt /> {t("login.secureAccess")}
          </span>

          <h1>{t("login.createWorkspaceAccount")}</h1>
          <p>{t("login.registerDescription")}</p>
        </div>
      </section>

      <section className="register-design__panel">
        <form className="register-design__card" onSubmit={handleRegister}>
          <div className="register-design__icon">
            <FaUserPlus />
          </div>

          <h2>{t("login.createAccount")}</h2>

          <p className="register-design__subtitle">
            {t("login.registerSubtitle")}
          </p>

          {/* EMAIL */}
          <div className="register-design__field">
            <label>{t("login.email")}</label>
            <div className="register-design__input-wrapper">
              <FaEnvelope />
              <input
                type="email"
                value={user}
                onChange={(e) => handleChange("user", e.target.value)}
                placeholder={t("login.emailPlaceholder")}
                disabled={submitting}
                autoComplete="email"
              />
            </div>
          </div>

          {/* PASSWORD */}
          <div className="register-design__field">
            <label>{t("login.password")}</label>
            <input
              type="password"
              value={pass}
              onChange={(e) => handleChange("pass", e.target.value)}
              placeholder={t("login.passwordPlaceholder")}
              disabled={submitting}
              autoComplete="new-password"
            />
          </div>

          {/* CONFIRM PASSWORD */}
          <div className="register-design__field">
            <label>{t("login.confirmPassword")}</label>
            <input
              type="password"
              value={rpass}
              onChange={(e) => handleChange("rpass", e.target.value)}
              placeholder={t("login.confirmPasswordPlaceholder")}
              disabled={submitting}
              autoComplete="new-password"
            />
          </div>

          <button
            type="submit"
            className="register-design__primary"
            disabled={submitting}
          >
            {submitting
              ? tr("login.registering", "Creating account...")
              : t("login.register")}
          </button>

          <p className="register-design__signin">
            {t("login.alreadyMember")}{" "}
            <a href="/">{t("login.signIn")}</a>
          </p>
        </form>
      </section>
    </div>
  );
}

export default Register_Component;