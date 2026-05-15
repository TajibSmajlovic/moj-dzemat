import {
  DEFAULT_THEME_PREFERENCE,
  THEME_COOKIE_NAME,
  normalizeThemePreference,
  type ThemePreference,
} from "#app/lib/theme";

export function getThemePreference(request: Request): ThemePreference {
  const value = readCookie(request.headers.get("Cookie"), THEME_COOKIE_NAME);

  return normalizeThemePreference(value ?? DEFAULT_THEME_PREFERENCE);
}

function readCookie(header: string | null, name: string): string | null {
  if (!header) return null;

  const prefix = `${name}=`;
  const cookie = header
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(prefix));

  return cookie ? decodeURIComponent(cookie.slice(prefix.length)) : null;
}
