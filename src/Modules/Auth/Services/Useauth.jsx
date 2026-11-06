// useAuth.jsx
// React context + hook around authService.
// Wrap your app once with <AuthProvider>, then call useAuth() anywhere.
//
// Three possible user states surfaced by this hook:
//   1) user === null                        → no session / not logged in
//   2) user && user.inactive === true       → account exists but is blocked
//                                             (disabled, not active, or
//                                              local_status != ACTIVE)
//   3) user && user.inactive === false      → fully active session
//
// Helpers exposed on the context:
//   - isAuthenticated  → true only for state (3)
//   - isInactive       → true only for state (2)
//   - inactiveReason   → human-readable reason from the backend (state 2)
//   - emailVerified    → boolean flag from /getuserinfo (states 2 and 3)

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import authService, { AuthError } from "./authService";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);       // see states above
  const [loading, setLoading] = useState(true); // initial check in progress
  const [error, setError] = useState(null);

  // Track in-flight fetches so we can cancel on unmount / refetch
  const abortRef = useRef(null);

  const refresh = useCallback(async () => {
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError(null);
    try {
      const me = await authService.getCurrentUser(controller.signal);
      setUser(me); // null | inactive user | active user
    } catch (err) {
      if (err.name !== "AbortError") {
        setError(err);
        setUser(null);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  // Login with a Firebase ID token, then re-fetch the user from the cookie.
  const login = useCallback(
    async (firebaseIdToken) => {
      setError(null);
      try {
        await authService.login(firebaseIdToken);
        // Cookie is now set by the server — pull fresh user info.
        await refresh();
        return true;
      } catch (err) {
        setError(err);
        setUser(null);
        return false;
      }
    },
    [refresh]
  );

  // Local-only logout. If you add a /logout endpoint on the backend that
  // clears the cookie, call it here before resetting state.
  const logout = useCallback(() => {
    setUser(null);
  }, []);

  // Run an initial session check on mount.
  useEffect(() => {
    refresh();
    return () => {
      if (abortRef.current) abortRef.current.abort();
    };
  }, [refresh]);

  const value = useMemo(() => {
    const hasUser = !!user;
    const inactive = hasUser && !!user.inactive;
    const authenticated = hasUser && !inactive;

    return {
      user,
      loading,
      error,

      // Flags
      isAuthenticated: authenticated,   // true ONLY for active, usable session
      isInactive: inactive,             // true when account exists but blocked
      inactiveReason: inactive ? user.inactiveReason : null,
      emailVerified: hasUser ? !!user.emailVerified : false,

      // Actions
      login,
      logout,
      refresh,
    };
  }, [user, loading, error, login, logout, refresh]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used inside <AuthProvider>");
  }
  return ctx;
}

// Optional helper for route guards.
//
// Usage:
//   <RequireAuth
//     fallback={<Login />}
//     inactiveFallback={<AccountBlocked />}
//     loadingFallback={<Spinner />}
//   >
//     <Dashboard />
//   </RequireAuth>
//
// - loading           → renders `loadingFallback`
// - inactive account  → renders `inactiveFallback` (falls back to `fallback`
//                       if not provided, so existing callers keep working)
// - not logged in     → renders `fallback`
// - active session    → renders children
export function RequireAuth({
  children,
  fallback = null,
  inactiveFallback,
  loadingFallback = null,
}) {
  const { isAuthenticated, isInactive, loading } = useAuth();

  if (loading) return loadingFallback;
  if (isInactive) return inactiveFallback !== undefined ? inactiveFallback : fallback;
  if (!isAuthenticated) return fallback;
  return children;
}

export { AuthError };