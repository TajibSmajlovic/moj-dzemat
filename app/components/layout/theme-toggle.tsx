import { useSyncExternalStore, type CSSProperties } from "react";
import { useRouteLoaderData } from "react-router";

import { Moon, Sun } from "lucide-react";

import { Button } from "#app/components/ui/button";
import { cn } from "#app/lib/cn";
import {
  DEFAULT_THEME_PREFERENCE,
  THEME_CHANGE_EVENT,
  THEME_COOKIE_NAME,
  THEME_STORAGE_KEY,
  isThemePreference,
  setThemePreference,
  type ThemePreference,
} from "#app/lib/theme";

type ThemeToggleProps = {
  className?: string;
  style?: CSSProperties;
  tabIndex?: number;
};

export function ThemeToggle({ className, style, tabIndex }: ThemeToggleProps) {
  const data = useRouteLoaderData<{ themePreference?: ThemePreference }>("root");
  const serverTheme = data?.themePreference ?? DEFAULT_THEME_PREFERENCE;
  const theme = useSyncExternalStore(
    subscribeToThemePreference,
    getClientThemeSnapshot,
    () => serverTheme,
  );

  const nextTheme: ThemePreference = theme === "dark" ? "light" : "dark";
  const label = theme === "dark" ? "Uključi svijetlu temu" : "Uključi tamnu temu";

  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      title={label}
      aria-label={label}
      aria-pressed={theme === "dark"}
      style={style}
      tabIndex={tabIndex}
      className={cn(
        "border-border/70 bg-card/80 hover:bg-accent hover:text-accent-foreground relative rounded-full shadow-sm backdrop-blur-md",
        "transition-[background-color,color,border-color,box-shadow,transform] duration-300",
        "dark:border-border dark:bg-card/70 dark:shadow-[0_12px_30px_hsl(var(--background)/0.34)]",
        className,
      )}
      onClick={() => commitThemePreference(nextTheme)}
    >
      <Moon
        className={cn(
          "absolute h-4 w-4 transition-all duration-300",
          theme === "dark"
            ? "scale-75 -rotate-90 opacity-0"
            : "text-primary scale-100 rotate-0 opacity-100",
        )}
        aria-hidden="true"
      />
      <Sun
        className={cn(
          "absolute h-4 w-4 transition-all duration-300",
          theme === "dark"
            ? "text-secondary scale-100 rotate-0 opacity-100"
            : "scale-75 rotate-90 opacity-0",
        )}
        aria-hidden="true"
      />
    </Button>
  );
}

/**
   Apply the theme through the View Transition API when available so the
   background/foreground swap animates as a smooth crossfade. Falls back
   to an instant swap on browsers without the API or for users who opted
   into reduced motion.
 */
function commitThemePreference(theme: ThemePreference) {
  const prefersReducedMotion =
    globalThis.window !== undefined &&
    globalThis.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

  const apply = () => setThemePreference(theme);

  const startViewTransition = (
    document as Document & {
      startViewTransition?: (callback: () => void) => unknown;
    }
  ).startViewTransition;

  if (!prefersReducedMotion && typeof startViewTransition === "function") {
    startViewTransition.call(document, apply);
    return;
  }

  apply();
}

function subscribeToThemePreference(onChange: () => void) {
  if (globalThis.window === undefined) return () => undefined;

  globalThis.addEventListener(THEME_CHANGE_EVENT, onChange);
  globalThis.addEventListener("storage", onChange);

  return () => {
    globalThis.removeEventListener(THEME_CHANGE_EVENT, onChange);
    globalThis.removeEventListener("storage", onChange);
  };
}

function getClientThemeSnapshot(): ThemePreference {
  return readClientThemePreference() ?? DEFAULT_THEME_PREFERENCE;
}

function readClientThemePreference(): ThemePreference | null {
  if (typeof document === "undefined") return null;

  try {
    const stored = globalThis.localStorage?.getItem(THEME_STORAGE_KEY);
    if (isThemePreference(stored)) return stored;
  } catch {
    // Ignore storage access errors; the cookie and current DOM class are enough.
  }

  const cookieValue = document.cookie
    .split("; ")
    .find((entry) => entry.startsWith(`${THEME_COOKIE_NAME}=`))
    ?.split("=")[1];

  if (cookieValue) {
    const decoded = decodeURIComponent(cookieValue);
    if (isThemePreference(decoded)) return decoded;
  }

  return document.documentElement.classList.contains("dark") ? "dark" : null;
}
