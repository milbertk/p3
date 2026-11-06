import { useCallback, useEffect, useState } from "react";

/**
 * Light / dark mode (2026-10-24).
 *
 * The preference is "light", "dark" or "system" (follow the device) and is
 * saved per browser. The resolved theme is written to <html data-theme="…">;
 * Shared/Styles/DarkTheme.scss does the rest.
 */
export const THEME_STORAGE_KEY = "alephk.theme";
export const THEME_OPTIONS = ["light", "dark", "system"];
const THEME_CHANGED_EVENT = "alephkThemeChanged";

export function readThemePreference() {
  try {
    const value = localStorage.getItem(THEME_STORAGE_KEY);
    return THEME_OPTIONS.includes(value) ? value : "light";
  } catch {
    return "light";
  }
}

function systemPrefersDark() {
  try {
    return window.matchMedia?.("(prefers-color-scheme: dark)")?.matches === true;
  } catch {
    return false;
  }
}

export function resolveTheme(preference) {
  if (preference === "system") return systemPrefersDark() ? "dark" : "light";
  return preference === "dark" ? "dark" : "light";
}

export function applyThemePreference(preference) {
  const resolved = resolveTheme(preference);
  document.documentElement.setAttribute("data-theme", resolved);
  return resolved;
}

// Apply as soon as the app loads (no white flash before React renders).
applyThemePreference(readThemePreference());

export default function useTheme() {
  const [preference, setPreferenceState] = useState(readThemePreference);
  const [resolved, setResolved] = useState(() => resolveTheme(readThemePreference()));

  const setPreference = useCallback((next) => {
    const value = THEME_OPTIONS.includes(next) ? next : "light";
    try {
      localStorage.setItem(THEME_STORAGE_KEY, value);
    } catch {
      // storage blocked: the choice still applies until the page reloads
    }
    setPreferenceState(value);
    setResolved(applyThemePreference(value));
    window.dispatchEvent(new CustomEvent(THEME_CHANGED_EVENT, { detail: value }));
  }, []);

  // Other screens (or tabs) changed it.
  useEffect(() => {
    const sync = () => {
      const value = readThemePreference();
      setPreferenceState(value);
      setResolved(applyThemePreference(value));
    };
    const onStorage = (event) => {
      if (event.key === THEME_STORAGE_KEY) sync();
    };
    window.addEventListener(THEME_CHANGED_EVENT, sync);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(THEME_CHANGED_EVENT, sync);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  // "Same as my device": follow the device when it switches.
  useEffect(() => {
    if (preference !== "system" || !window.matchMedia) return undefined;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => setResolved(applyThemePreference("system"));
    media.addEventListener?.("change", onChange);
    return () => media.removeEventListener?.("change", onChange);
  }, [preference]);

  return { preference, resolved, setPreference };
}
