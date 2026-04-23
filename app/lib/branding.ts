const ROOT_ROUTE_ID = "root";

export const DEFAULT_SITE_NAME = "Moj Džemat";

export function formatSiteName(dzematName?: string | null): string {
  const normalized = dzematName?.trim();

  return normalized ? `${DEFAULT_SITE_NAME} - ${normalized}` : DEFAULT_SITE_NAME;
}

export function formatPageTitle(pageTitle: string, siteName = DEFAULT_SITE_NAME): string {
  return `${pageTitle} — ${siteName}`;
}

export function getSiteNameFromRootData(data: unknown): string {
  if (
    !data ||
    typeof data !== "object" ||
    !("siteName" in data) ||
    typeof data.siteName !== "string"
  ) {
    return DEFAULT_SITE_NAME;
  }

  return data.siteName;
}

type MatchWithData = {
  id: string;
  data?: unknown;
};

export function getSiteNameFromMatches(matches: readonly (MatchWithData | undefined)[]): string {
  return getSiteNameFromRootData(matches.find((match) => match?.id === ROOT_ROUTE_ID)?.data);
}
