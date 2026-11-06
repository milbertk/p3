import "./App.css";
import "./Shared/i18n/i18n";
// Light / dark mode: applies the saved choice before the first render.
import "./Shared/Hooks/useTheme";
import "./Shared/Styles/DarkTheme.scss";

import { useTranslation } from "react-i18next";
import { useEffect, useRef, useState, createContext } from "react";

import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import Login_Component from "./Modules/Auth/Components/Login_Component";

import authService from "./Modules/Auth/Services/Authservice";
import UnverifiedPage from "./Modules/Auth/Pages/main/unverifiedPage";
import InactiveUserPage from "./Modules/Auth/Pages/main/inactiveUserPage";
import StarterPage from "./Modules/MainConfigurations/Pages/StarterPage";
import AppRoutes from "./Shared/routing/routing";
import { CurrentUserContext } from "./Shared/Utils/CurrentUserContext";
import { startModalStacking } from "./Shared/Utils/modalStacking";

export const AppContext = createContext(null);

// Timeout máximo para el chequeo de sesión. Si /getuserinfo no responde
// en este tiempo, abortamos y tratamos al usuario como deslogueado.
const AUTH_CHECK_TIMEOUT_MS = 8000;

function App() {
  const { t, i18n } = useTranslation();

  // tRef contiene siempre la versión más reciente de `t` sin meterla en
  // dependencias del useEffect. Esto evita que el useEffect se reinicie
  // en cada render (que es lo que estaba causando el "loading infinito":
  // el fetch arrancaba, el cleanup lo abortaba antes de terminar, y se
  // repetía sin parar).
  const tRef = useRef(t);
  useEffect(() => {
    tRef.current = t;
  }, [t]);

  // Toggle: la cambiamos desde Login/Logout/Verify para forzar un nuevo chequeo.
  const [refreshCheckLogin, setRefreshCheckLogin] = useState(false);

  const [isLoged, setShowLoged] = useState(false);
  const [isActive, setShowIsActive] = useState(false);
  const [isVerified, seIsVerified] = useState(false);
  // Signed-in user for the header tag and the user menu (QA 2026-10-29).
  const [currentUser, setCurrentUser] = useState(null);

  // Windows opened from other windows always show on top (2026-10-29).
  useEffect(() => startModalStacking(), []);

  // Empezamos en true para mostrar Loading antes que la pantalla Login.
  const [authChecking, setAuthChecking] = useState(true);

  useEffect(() => {
    const browserLanguage = navigator.language?.split("-")[0] || "en";
    i18n.changeLanguage(browserLanguage);
  }, [i18n]);

  // Chequeo de auth — corre al montar y cada vez que refreshCheckLogin cambia.
  // NO incluir `t` en las dependencias: cambia en cada render.
  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    const timeoutId = setTimeout(() => {
      console.warn("Auth check timed out — aborting");
      controller.abort();
    }, AUTH_CHECK_TIMEOUT_MS);

    async function checkLogin() {
      console.log("Checking login...");
      setAuthChecking(true);

      try {
        const me = await authService.getCurrentUser(controller.signal);

        if (cancelled) return;

        if (!me) {
          setCurrentUser(null);
          setShowLoged(false);
          setShowIsActive(false);
          seIsVerified(false);
          return;
        }

        setCurrentUser({ name: me.name || "", email: me.email || "" });
        setShowLoged(true);
        setShowIsActive(!me.inactive);
        seIsVerified(!!me.emailVerified);
      } catch (err) {
        if (cancelled) return;

        if (err.name === "AbortError") {
          console.warn("Auth check aborted (timeout or unmount).");
          setShowLoged(false);
          setShowIsActive(false);
          seIsVerified(false);
          return;
        }

        console.error("Auth check failed:", err);
        const tNow = tRef.current;
        toast.error(
          (typeof tNow === "function" && tNow("auth.check_failed")) ||
            "Could not verify your session"
        );
        setShowLoged(false);
        setShowIsActive(false);
        seIsVerified(false);
      } finally {
        clearTimeout(timeoutId);
        if (!cancelled) setAuthChecking(false);
      }
    }

    checkLogin();

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
      controller.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshCheckLogin]); // ← SOLO refreshCheckLogin, NO `t`

  // ---------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------

  let content;
  if (authChecking) {
    content = <h1>{t("app.loading")}</h1>;
  } else if (!isLoged) {
    content = (
      <div>
        <Login_Component
          setRefreshCheckLogin={setRefreshCheckLogin}
          t={t}
        />
      </div>
    );
  } else if (!isActive) {
    content = (
      <InactiveUserPage
        t={t}
        setRefreshCheckLogin={setRefreshCheckLogin}
      />
    );
  } else if (!isVerified) {
    content = (
      <UnverifiedPage
        t={t}
        setRefreshCheckLogin={setRefreshCheckLogin}
      />
    );
  } else {
    content = <AppRoutes t = {t} setRefreshCheckLogin = {setRefreshCheckLogin}></AppRoutes>
  }

  return (
    <AppContext.Provider
      value={{
        refreshCheckLogin,
        setRefreshCheckLogin,
        isLoged,
        isActive,
        isVerified,
      }}
    >
      <CurrentUserContext.Provider value={currentUser}>
        {content}
      </CurrentUserContext.Provider>

      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        pauseOnHover
        draggable
        theme="light"
      />
    </AppContext.Provider>
  );
}

export default App;
