import React, { useState } from "react";
import {
  FaUserSlash,
  FaSignOutAlt,
  FaHeadset,
  FaExclamationCircle,
} from "react-icons/fa";
import { getAuth, signOut } from "firebase/auth";
import { toast } from "react-toastify";

import authService from "../Services/Authservice";
import "./InactiveComponent.scss";

export default function InactiveComponent({
  email = "",
  // Optional human-readable reason from the backend
  // (e.g. "Account is disabled", "Account local status is not ACTIVE")
  reason = "",
  // Setter from App.jsx — toggling it re-runs the parent auth-check effect,
  // which will see the cookie is gone and route the user back to the login.
  setRefreshCheckLogin,
  // Will be wired to the actual support flow later. For now it just opens
  // a placeholder action so the button works end-to-end.
  onContactSupport = () => {},
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

  // Logout flow:
  //   1) Sign out of Firebase on the client (clears the local Firebase
  //      session so the next login forces a fresh ID token).
  //   2) Clear the backend HttpOnly cookie (POST /logout).
  //   3) Toggle refreshCheckLogin so App re-runs the auth check, sees no
  //      session, and renders the login screen.
  const handleLogout = async () => {
    if (busy) return;
    setBusy(true);

    // --- 1) Firebase client signOut. Best-effort.
    try {
      await signOut(getAuth());
    } catch (err) {
      console.error("Firebase signOut failed:", err);
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

  // Support button — currently delegates to the prop. The parent can pass
  // a handler that opens a ticket modal, redirects to a help page, etc.
  const handleContactSupport = () => {
    try {
      onContactSupport();
      toast.info(
        translate(
          "inactive.support_opened",
          "Opening support..."
        )
      );
    } catch (err) {
      console.error("onContactSupport failed:", err);
      toast.error(
        translate(
          "inactive.support_error",
          "Could not open support. Please try again."
        )
      );
    }
  };

  return (
    <section className="inactive-page">
      <div className="inactive-card">
        <div className="inactive-icon">
          <FaUserSlash />
        </div>

        <h1>{translate("inactive.title", "Account inactive")}</h1>

        <p className="inactive-description">
          {translate(
            "inactive.description",
            "Your account is currently inactive and cannot be used to access the application."
          )}
        </p>

        {email && <div className="inactive-email">{email}</div>}

        {reason && (
          <div className="inactive-reason">
            <FaExclamationCircle />
            <span>{reason}</span>
          </div>
        )}

        <div className="inactive-steps">
          <div className="step">
            <FaExclamationCircle />
            <span>
              {translate(
                "inactive.step1",
                "If you believe this is a mistake, contact our support team."
              )}
            </span>
          </div>

          <div className="step">
            <FaExclamationCircle />
            <span>
              {translate(
                "inactive.step2",
                "If you no longer need access, you can log out below."
              )}
            </span>
          </div>
        </div>

        <div className="inactive-actions">
          <button
            className="btn-primary"
            onClick={handleContactSupport}
            disabled={busy}
          >
            <FaHeadset />
            {translate("inactive.support", "Contact support")}
          </button>

          <button
            className="btn-secondary"
            onClick={handleLogout}
            disabled={busy}
          >
            <FaSignOutAlt />
            {busy
              ? translate("inactive.logging_out", "Logging out...")
              : translate("inactive.logout", "Log out")}
          </button>
        </div>
      </div>
    </section>
  );
}