/** `view-transition-class` that React assigns to public section snapshots. */
export const PUBLIC_SECTION_TRANSITION_CLASS = "public-section";

export function hasNavigationStateFlag(state: unknown, key: string): boolean {
  return isRecord(state) && state[key] === true;
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
