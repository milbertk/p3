import React, { useState } from "react";
import {
  FaEnvelopeOpenText,
  FaRedoAlt,
  FaCheckCircle,
  FaSignOutAlt,
} from "react-icons/fa";
import { getAuth, sendEmailVerification, signOut } from "firebase/auth";
import { toast } from "react-toastify";

import authService from "../Services/Authservice";
import "./UnverifiedComponent.scss";
import { propTypes } from "react-bootstrap/esm/Image";

export default function UnverifiedComponent({
  email = "",
  // Setter from App.jsx — toggling it re-runs the parent auth-check effect,
  // which will see the cookie is gone and route the user back to the login.
  setRefreshCheckLogin,
  t,
}) {
  const [busy, setBusy] = useState(false);

  // Defensive translate helper — keeps the component working if `t` is
  // ever passed as undefined.
  const translate = (key, fallback) => {
    try {
      return typeof t === "function" ? t(key) || fallback : fallback;
    } catch {
      return fallback;
    }
  };



  // Single-button flow:
  //   1) Ask Firebase to send a verification email to the currently
  //      signed-in user.
  //   2) Clear the backend HttpOnly cookie (POST /logout).
  //   3) Toggle refreshCheckLogin so App re-runs the auth check, sees no
  //      session, and renders the login screen.
  //
  // Each step is wrapped so a failure in one doesn't silently swallow the
  // others — the user gets feedback either way.
  const handleResendAndLogout = async () => {
    if (busy) return;
    setBusy(true);

    // --- 1) Send verification email via Firebase client SDK.
    try {
      const fbUser = getAuth().currentUser;
      if (fbUser) {
        await sendEmailVerification(fbUser);
        toast.success(
          t(
            "unverified.email_sent",
            "Verification email sent. Check your inbox."
          )
        );
      } else {
        // No Firebase session on this device (e.g. user reloaded the page
        // after the backend cookie was set but Firebase auth state was lost).
        // We can't send the email from the client in that case.
        toast.info(
          t(
            "unverified.no_firebase_session",
            "Please log in again to resend the verification email."
          )
        );
      }
    } catch (err) {
      console.error("sendEmailVerification failed:", err);
      toast.error(
        t(
          "unverified.email_error",
          "Could not send the verification email. Please try again."
        )
      );
    }

    // --- 2) Clear backend cookie. Best-effort: even if this fails (e.g.
    // network blip), we still want to bounce the user to the login screen.
    try {
      await authService.logout();
    } catch (err) {
      console.error("Logout failed:", err);
    }

    // --- 3) Re-run the parent auth check. Cookie is gone → user lands on login.
    if (typeof setRefreshCheckLogin === "function") {
      setRefreshCheckLogin((prev) => !prev);
    }

    setBusy(false);
  };

  // "Sign out" without sending any email (2026-10-27):
  //   1) sign out of Firebase on this device,
  //   2) clear the backend HttpOnly cookie (POST /logout),
  //   3) toggle refreshCheckLogin so App shows the login screen.
  const handleSignOut = async () => {
    if (busy) return;
    setBusy(true);

    try {
      await signOut(getAuth());
    } catch (err) {
      console.error("Firebase signOut failed:", err);
    }

    try {
      await authService.logout();
    } catch (err) {
      console.error("Logout failed:", err);
    }

    if (typeof setRefreshCheckLogin === "function") {
      setRefreshCheckLogin((prev) => !prev);
    }

    setBusy(false);
  };

  return (
    <section className="unverified-page">
      <div className="unverified-card">
        <div className="unverified-icon">
          <FaEnvelopeOpenText />
        </div>

        <h1>{t("unverified.title", "Verify your email")}</h1>

        <p className="unverified-description">
          {t(
            "unverified.description",
            "Your account has been created, but your email address has not been verified yet."
          )}
        </p>

        {email && <div className="unverified-email">{email}</div>}

        <div className="unverified-steps">
          <div className="step">
            <FaCheckCircle />
            <span>
              {t(
                "unverified.step1",
                "Click the button below to receive a verification email."
              )}
            </span>
          </div>

          <div className="step">
            <FaCheckCircle />
            <span>
              {t(
                "unverified.step2",
                "Open the email and click the verification link."
              )}
            </span>
          </div>

          <div className="step">
            <FaCheckCircle />
            <span>
              {t(
                "unverified.step3",
                "Return to the login screen and sign in again."
              )}
            </span>
          </div>
        </div>

        <div className="unverified-actions">
          <button
            className="btn-primary"
            onClick={handleResendAndLogout}
            disabled={busy}
          >
            <FaRedoAlt />
            {busy
              ? t("unverified.sending", "Sending...")
              : t(
                  "unverified.resend",
                  "Resend verification email"
                )}
          </button>

          <button
            className="btn-secondary"
            onClick={handleSignOut}
            disabled={busy}
          >
            <FaSignOutAlt />
            {t("unverified.signOut", "Sign out")}
          </button>
        </div>
      </div>
    </section>
  );
}