export const VIEW_TRANSITION_KIND_ATTRIBUTE = "data-view-transition-kind";

export const PUBLIC_VIEW_TRANSITION_KINDS = ["section", "theme"] as const;

export type PublicViewTransitionKind = (typeof PUBLIC_VIEW_TRANSITION_KINDS)[number];

export function hasNavigationStateFlag(state: unknown, key: string): boolean {
  return isRecord(state) && Boolean(state[key]);
}

export function isPublicPathname(pathname: string): boolean {
  return (
    pathname === "/" ||
    pathname === "/objave" ||
    pathname.startsWith("/objave/") ||
    pathname === "/kontakt" ||
    pathname === "/pitanja-i-odgovori" ||
    pathname.startsWith("/pitanja-i-odgovori/")
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
