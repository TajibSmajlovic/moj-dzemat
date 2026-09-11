import { THEME_CHANGE_EVENT, type ThemePreference } from "../../app/features/theme/theme";

export * from "../../app/features/theme/theme";
export const THEME_COOKIE_NAME = "storybook-preview-theme";
export const THEME_STORAGE_KEY = "storybook-preview-theme";

export function setThemePreference(theme: ThemePreference): void {
  document.documentElement.classList.toggle("dark", theme === "dark");
  globalThis.dispatchEvent(new Event(THEME_CHANGE_EVENT));
}
