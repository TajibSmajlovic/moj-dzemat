import { DAY_SECONDS } from "#app/lib/time";

export const THEME_COOKIE_NAME = "mdz_theme";
export const THEME_STORAGE_KEY = "moj-dzemat-theme";
const THEME_COOKIE_MAX_AGE_SECONDS = 365 * DAY_SECONDS;

/**
   Custom DOM event the toggle dispatches after persisting a new preference.
   Lives here (not in the toggle component) so any other surface can react —
   e.g. a future settings page that flips the theme without unmounting.
 */
export const THEME_CHANGE_EVENT = "moj-dzemat-theme-change";

const _THEME_PREFERENCES = ["light", "dark"] as const;

export type ThemePreference = (typeof _THEME_PREFERENCES)[number];

export const DEFAULT_THEME_PREFERENCE: ThemePreference = "light";

export function isThemePreference(value: unknown): value is ThemePreference {
  return value === "light" || value === "dark";
}

export function normalizeThemePreference(value: unknown): ThemePreference {
  return isThemePreference(value) ? value : DEFAULT_THEME_PREFERENCE;
}

/**
   Persist + apply a theme preference and notify subscribers in one call.
   Safe to invoke from anywhere on the client; no-ops on the server.

   Cookie is `Secure` on HTTPS so it never leaks over plaintext, and falls
   back to non-secure on `http://localhost` for local development.
 */
export function setThemePreference(theme: ThemePreference): void {
  if (typeof document === "undefined") return;

  try {
    globalThis.localStorage?.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // Private browsing or locked-down storage should not break theme switching.
  }

  const isSecure = typeof location !== "undefined" && location.protocol === "https:";
  const parts = [
    `${THEME_COOKIE_NAME}=${encodeURIComponent(theme)}`,
    `Max-Age=${THEME_COOKIE_MAX_AGE_SECONDS}`,
    "Path=/",
    "SameSite=Lax",
  ];
  if (isSecure) parts.push("Secure");
  // eslint-disable-next-line unicorn/no-document-cookie -- Server-readable theme cookie prevents dark-mode flash on full page loads.
  document.cookie = parts.join("; ");

  document.documentElement.classList.toggle("dark", theme === "dark");

  globalThis.dispatchEvent(new Event(THEME_CHANGE_EVENT));
}
