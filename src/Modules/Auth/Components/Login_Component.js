import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import {
  FaGoogle,
  FaFacebookF,
  FaMicrosoft,
  FaApple,
} from "react-icons/fa";
import {
  browserLocalPersistence,
  sendPasswordResetEmail,
  setPersistence,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
} from "firebase/auth";

import "./Login_Component.scss";
import BasicModal from "../../../Shared/Components/BasicModal/BasicModal";
import Register_Component from "./Register_Component";

import LoginUserService from "../Services/LoginUserService";
import BrandLogo, { PoweredBy } from "../../../Shared/Components/Brand/BrandLogo";
import {
  auth,
  googleProvider,
  facebookProvider,
  microsoftProvider,
} from "../../../Shared/firebase/firebase";
import {
  AUTH_STATES,
  authProviderState,
  authSoonLabel,
  authSoonMessage,
} from "../../../Shared/Utils/authProviders";

// Facebook, Microsoft and Apple sign-in buttons are shown. Facebook and
// Microsoft only work once they are configured in Firebase; Apple shows a
// "coming soon" message. Set to false to hide the three buttons again.
// (2026-10-26) Each button is now also controlled by its .env flag
// (REACT_APP_AUTH_GOOGLE / _EMAIL / _MICROSOFT / _FACEBOOK / _APPLE =
// active | soon | hidden), see src/Shared/Utils/authProviders.js.
const SHOW_EXTRA_LOGIN_PROVIDERS = true;

// Social buttons in the order they are shown.
const SOCIAL_BUTTONS = [
  { name: "Google", Icon: FaGoogle, labelKey: "login.google", extra: false },
  { name: "Facebook", Icon: FaFacebookF, labelKey: "login.facebook", extra: true },
  { name: "Microsoft", Icon: FaMicrosoft, labelKey: "login.microsoft", extra: true },
  { name: "Apple", Icon: FaApple, labelKey: "login.apple", extra: true },
];

function Login_Component(props) {
  const { setRefreshCheckLogin, t } = props;
  const { i18n } = useTranslation();
  const lang = i18n?.language || "es";
  const emailState = authProviderState("email");

  const [showRegister, setShowRegister] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sendingReset, setSendingReset] = useState(false);

  const tr = (key, fallback) => {
    try {
      const value = typeof t === "function" ? t(key) : null;
      return value && value !== key ? value : fallback;
    } catch {
      return fallback;
    }
  };

  const friendlyFirebaseError = (error) => {
    const code = error?.code || "";

    switch (code) {
      case "auth/invalid-email":
        return tr("login.invalidEmail", "The email address is not valid.");
      case "auth/user-disabled":
        return tr("login.userDisabled", "This account has been disabled.");
      case "auth/user-not-found":
        return tr("login.userNotFound", "No account found with this email.");
      case "auth/wrong-password":
      case "auth/invalid-credential":
        return tr("login.wrongPassword", "Incorrect email or password.");
      case "auth/too-many-requests":
        return tr(
          "login.tooManyRequests",
          "Too many attempts. Try again later."
        );
      case "auth/popup-closed-by-user":
        return tr("login.popupClosed", "Sign-in window was closed.");
      default:
        return error?.message || tr("login.loginError", "Login failed.");
    }
  };

  const validate = () => {
    if (!email.trim() || !password) {
      toast.error(tr("login.emptyLogin", "All fields are required."));
      return false;
    }
    const emailOk = /\S+@\S+\.\S+/.test(email.trim());
    if (!emailOk) {
      toast.error(tr("login.invalidEmail", "The email address is not valid."));
      return false;
    }
    return true;
  };

  const finalizeLogin = async (firebaseToken) => {
    const loginService = new LoginUserService();
    const result = await loginService.login(firebaseToken);

    if (result?.error) {
      throw new Error(result.message || tr("login.loginError", "Login failed."));
    }

    toast.success(tr("login.loginSuccess", "Signed in successfully."));

    // IMPORTANTE: usar el setter functional para que SIEMPRE cambie el valor
    // y dispare el useEffect en App.js. Si hacemos setRefreshCheckLogin(true)
    // y ya está en true, React no detecta cambio → no se re-chequea el login.
    if (typeof setRefreshCheckLogin === "function") {
      setRefreshCheckLogin((prev) => !prev);
    }
  };

  const handleEmailLogin = async (e) => {
    e?.preventDefault?.();
    if (submitting) return;
    // .env flag (2026-10-26): "soon" only shows a message, no login code runs.
    if (emailState !== AUTH_STATES.ACTIVE) {
      toast.info(authSoonMessage(lang));
      return;
    }
    if (!validate()) return;

    try {
      setSubmitting(true);

      await setPersistence(auth, browserLocalPersistence);

      const userCredential = await signInWithEmailAndPassword(
        auth,
        email.trim(),
        password
      );
      const firebaseToken = await userCredential.user.getIdToken();

      await finalizeLogin(firebaseToken);
    } catch (error) {
      console.error("Email login error:", error);
      toast.error(friendlyFirebaseError(error));
    } finally {
      setSubmitting(false);
    }
  };

  // "Forgot your password?" (2026-10-24): Firebase emails a reset link.
  // The answer is always the same, so nobody can learn which emails exist.
  const handleForgotPassword = async () => {
    if (sendingReset || submitting) return;
    const target = email.trim();
    if (!/\S+@\S+\.\S+/.test(target)) {
      toast.info(tr("login.forgotEnterEmail", "Write your email above, then press \"Forgot your password?\" again."));
      return;
    }
    try {
      setSendingReset(true);
      auth.languageCode = (navigator.language || "en").split("-")[0];
      await sendPasswordResetEmail(auth, target);
    } catch (error) {
      if (error?.code === "auth/invalid-email") {
        toast.error(tr("login.invalidEmail", "The email address is not valid."));
        return;
      }
      if (error?.code === "auth/too-many-requests") {
        toast.error(tr("login.tooManyRequests", "Too many attempts. Try again later."));
        return;
      }
      // auth/user-not-found and others: same answer as success.
      console.warn("Password reset:", error?.code || error);
    } finally {
      setSendingReset(false);
    }
    toast.success(
      tr("login.forgotSent", "If an account exists for this email, we sent you a link to reset your password. Check your inbox and spam folder.")
    );
  };

  const handleSocialLogin = async (providerName) => {
    if (submitting) return;

    // .env flag (2026-10-26): "soon" only shows a message; the provider code
    // below is kept but not called. "hidden" buttons are not rendered at all.
    const providerState = authProviderState(providerName);
    if (providerState === AUTH_STATES.HIDDEN) return;
    if (providerState === AUTH_STATES.SOON) {
      toast.info(authSoonMessage(lang));
      return;
    }

    if (providerName === "Apple") {
      toast.info(tr("login.appleComingSoon", "Apple sign-in coming soon."));
      return;
    }

    const providerMapping = {
      Google: googleProvider,
      Facebook: facebookProvider,
      Microsoft: microsoftProvider,
    };

    const provider = providerMapping[providerName];
    if (!provider) {
      console.error("Unsupported provider:", providerName);
      return;
    }

    if (typeof provider.setCustomParameters === "function") {
      provider.setCustomParameters({ prompt: "select_account" });
    }

    try {
      setSubmitting(true);

      await setPersistence(auth, browserLocalPersistence);

      const userCredential = await signInWithPopup(auth, provider);
      const firebaseToken = await userCredential.user.getIdToken();

      await finalizeLogin(firebaseToken);
    } catch (error) {
      if (
        error?.code === "auth/popup-blocked" ||
        error?.code === "auth/popup-closed-by-user"
      ) {
        console.warn("Popup failed, falling back to redirect...");
        try {
          await signInWithRedirect(auth, provider);
        } catch (redirectErr) {
          console.error("Redirect login error:", redirectErr);
          toast.error(tr("login.socialLoginError", "Social sign-in failed."));
        }
      } else {
        console.error("Social login error:", error);
        toast.error(friendlyFirebaseError(error));
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="login-design">
      <section className="login-design__image">
        <div className="login-design__brand-chip">
          <BrandLogo />
        </div>
        <div className="login-design__image-content">
          <span className="login-design__badge">
            {t("login.businessPlatform")}
          </span>

          <h1>{t("login.manageCompanyTitle")}</h1>

          <p>{t("login.manageCompanyDescription")}</p>
        </div>
      </section>

      <section className="login-design__panel">
        <div className="login-design__mobile-header">
          <div className="login-design__mobile-header-content">
            <span className="login-design__badge">
              {t("login.businessPlatform")}
            </span>
            <h3>{t("login.manageCompanyTitle")}</h3>
          </div>
        </div>

        <form className="login-design__card" onSubmit={handleEmailLogin}>
          <div className="login-design__card-brand">
            <BrandLogo />
          </div>
          <h2>{t("login.signIn")}</h2>

          <p className="login-design__subtitle">
            {t("login.signInSubtitle")}
          </p>

          {/* Email sign-in: hidden when REACT_APP_AUTH_EMAIL=hidden (2026-10-26). */}
          {emailState !== AUTH_STATES.HIDDEN && (
            <>
              <div className="login-design__field">
                <label>{t("login.email")}</label>
                <input
                  type="email"
                  placeholder={t("login.emailPlaceholderLogin")}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={submitting}
                  autoComplete="email"
                />
              </div>

              <div className="login-design__field">
                <label>{t("login.password")}</label>
                <input
                  type="password"
                  placeholder={t("login.passwordPlaceholder")}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={submitting}
                  autoComplete="current-password"
                />
              </div>

              <div className="login-design__forgot">
                <button
                  type="button"
                  className="login-design__link-button"
                  onClick={handleForgotPassword}
                  disabled={submitting || sendingReset}
                >
                  {sendingReset
                    ? tr("login.forgotSending", "Sending...")
                    : tr("login.forgotPassword", "Forgot your password?")}
                </button>
              </div>

              <button
                className="login-design__primary"
                type="submit"
                disabled={submitting}
              >
                {submitting
                  ? tr("login.signingIn", "Signing in...")
                  : t("login.signIn")}
              </button>

              <div className="login-design__divider">
                <span>{t("login.orContinueWith")}</span>
              </div>
            </>
          )}

          <div className="login-design__social-grid">
            {/* Each button follows its .env flag (2026-10-26): active works,
                soon shows "Coming soon" and only a message, hidden is not shown.
                SHOW_EXTRA_LOGIN_PROVIDERS = false still hides Facebook,
                Microsoft and Apple. */}
            {SOCIAL_BUTTONS.filter(
              ({ name, extra }) =>
                (!extra || SHOW_EXTRA_LOGIN_PROVIDERS) &&
                authProviderState(name) !== AUTH_STATES.HIDDEN
            ).map(({ name, Icon, labelKey }) => {
              const soon = authProviderState(name) === AUTH_STATES.SOON;
              return (
                <button
                  key={name}
                  type="button"
                  className={soon ? "is-soon" : undefined}
                  onClick={() => handleSocialLogin(name)}
                  disabled={submitting}
                  aria-label={soon ? `${t(labelKey)} (${authSoonLabel(lang)})` : undefined}
                >
                  <Icon /> {t(labelKey)}
                  {soon && <span className="ak-soon">{authSoonLabel(lang)}</span>}
                </button>
              );
            })}
          </div>

          <p className="login-design__register">
            {t("login.dontHaveAccount")}{" "}
            <button
              type="button"
              className="login-design__register-button"
              onClick={() => setShowRegister(true)}
              disabled={submitting}
            >
              {t("login.createAccount")}
            </button>
          </p>
        </form>

        <PoweredBy label={t("brand.poweredBy", { defaultValue: "Powered by" })} />
      </section>

      <BasicModal show={showRegister} setShow={setShowRegister}>
        <Register_Component
          setRefreshCheckLogin={setRefreshCheckLogin}
          t={t}
        />
      </BasicModal>
    </div>
  );
}

export default Login_Component;