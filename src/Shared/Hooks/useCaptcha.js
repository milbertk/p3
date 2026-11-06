// CAPTCHA with Cloudflare Turnstile (2026-10-25, security S4).
//
//   const captcha = useCaptcha();
//   <CaptchaWidget captcha={captcha} language={i18n.language} />
//   ...send the request with header  X-Captcha-Token: captcha.token
//   ...after every attempt: captcha.reset()   (a token works only once)
//
// Which key is used:
//   - localhost / 127.0.0.1 / LAN addresses (192.168.x.x, 10.x.x.x,
//     172.16-31.x.x): Cloudflare's official TEST key, which always passes.
//     Your real key only works on the hostnames registered in Cloudflare.
//   - Any other address: REACT_APP_TURNSTILE_SITE_KEY (set in .env.production
//     before `npm run build`). Without it the CAPTCHA is not shown.
// The backend checks the token only when it has TURNSTILE_SECRET_KEY.
import { useCallback, useEffect, useRef, useState } from "react";

const SCRIPT_URL = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

// Cloudflare test site key: always passes (only for local testing).
export const TURNSTILE_TEST_SITE_KEY = "1x00000000000000000000AA";

const isLocalAddress = (host) =>
  host === "localhost" ||
  host === "127.0.0.1" ||
  host === "[::1]" ||
  host.endsWith(".local") ||
  /^192\.168\.\d+\.\d+$/.test(host) ||
  /^10\.\d+\.\d+\.\d+$/.test(host) ||
  /^172\.(1[6-9]|2\d|3[01])\.\d+\.\d+$/.test(host);

export function getCaptchaSiteKey() {
  const host = typeof window !== "undefined" ? window.location.hostname : "";
  if (isLocalAddress(host)) return TURNSTILE_TEST_SITE_KEY;
  return String(process.env.REACT_APP_TURNSTILE_SITE_KEY || "").trim();
}

// Loads Cloudflare's script once for the whole app.
let scriptPromise = null;
function loadTurnstile() {
  if (typeof window === "undefined") return Promise.reject(new Error("no window"));
  if (window.turnstile) return Promise.resolve(window.turnstile);
  if (!scriptPromise) {
    scriptPromise = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = SCRIPT_URL;
      script.async = true;
      script.defer = true;
      script.onload = () => (window.turnstile ? resolve(window.turnstile) : reject(new Error("turnstile missing")));
      script.onerror = () => {
        scriptPromise = null;
        reject(new Error("The security check could not be loaded"));
      };
      document.head.appendChild(script);
    });
  }
  return scriptPromise;
}

/** State of one CAPTCHA (one per form). */
export default function useCaptcha() {
  const [siteKey] = useState(getCaptchaSiteKey);
  const [token, setToken] = useState("");
  const [resetKey, setResetKey] = useState(0);
  const [loadError, setLoadError] = useState(false);

  const reset = useCallback(() => {
    setToken("");
    setResetKey((key) => key + 1);
  }, []);

  return {
    enabled: Boolean(siteKey),
    siteKey,
    token,
    // true when the form may be sent (no CAPTCHA, or a token is ready)
    ready: !siteKey || Boolean(token),
    setToken,
    resetKey,
    reset,
    loadError,
    setLoadError,
    // headers for fetch(): { "X-Captcha-Token": token } when there is one
    headers: token ? { "X-Captcha-Token": token } : {},
  };
}

/** The Turnstile box. Renders nothing when the CAPTCHA is off. */
export function CaptchaWidget({ captcha, language = "auto", className = "", style }) {
  const containerRef = useRef(null);
  const widgetIdRef = useRef(null);
  const { enabled, siteKey, setToken, resetKey, setLoadError } = captcha;

  useEffect(() => {
    if (!enabled || !containerRef.current) return undefined;
    let cancelled = false;
    loadTurnstile()
      .then((turnstile) => {
        if (cancelled || !containerRef.current) return;
        setLoadError(false);
        widgetIdRef.current = turnstile.render(containerRef.current, {
          sitekey: siteKey,
          theme: "auto",
          language: String(language || "auto").slice(0, 2),
          callback: (value) => setToken(value || ""),
          "expired-callback": () => setToken(""),
          "error-callback": () => setToken(""),
        });
      })
      .catch(() => {
        if (!cancelled) setLoadError(true);
      });
    return () => {
      cancelled = true;
      if (window.turnstile && widgetIdRef.current !== null) {
        try {
          window.turnstile.remove(widgetIdRef.current);
        } catch {
          /* already removed */
        }
      }
      widgetIdRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, siteKey, language]);

  // A new token is needed after every attempt.
  useEffect(() => {
    if (resetKey > 0 && window.turnstile && widgetIdRef.current !== null) {
      try {
        window.turnstile.reset(widgetIdRef.current);
      } catch {
        /* widget not ready */
      }
    }
  }, [resetKey]);

  if (!enabled) return null;
  return (
    <div
      ref={containerRef}
      className={`captcha-widget ${className}`.trim()}
      style={{ margin: "10px 0", minHeight: 65, ...style }}
    />
  );
}

/** True when a server answer is a CAPTCHA problem. */
export function isCaptchaError(code) {
  return code === "CAPTCHA_REQUIRED" || code === "CAPTCHA_FAILED" || code === "CAPTCHA_UNAVAILABLE";
}
