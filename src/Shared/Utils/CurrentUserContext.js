// Signed-in user shown in the header and the user menu (QA 2026-10-29).
// App.js fills it from /getuserinfo: { name, email } or null.
import { createContext, useContext } from "react";

export const CurrentUserContext = createContext(null);

export function useCurrentUser() {
  return useContext(CurrentUserContext);
}

/** Text for the small tag: name, or the email when there is no name. */
export function currentUserLabel(user) {
  if (!user) return "";
  return String(user.name || "").trim() || String(user.email || "").trim();
}
