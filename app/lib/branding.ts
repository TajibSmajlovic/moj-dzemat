import { useRootLoaderData } from "#app/lib/root-loader-data";

export const DEFAULT_SITE_NAME = "Moj Džemat";
const DEFAULT_SITE_DESCRIPTION_PREFIX = "Zvanična stranica džemata";
const DEFAULT_SITE_DESCRIPTION_SUFFIX =
  "za aktuelne obavijesti, hutbe, sergije, smrtovnice i priče.";

type SiteNameParts = {
  brandName: string;
  dzematName: string | null;
};

export function formatSiteName(dzematName?: string | null): string {
  const normalized = dzematName?.trim();

  return normalized ? `${DEFAULT_SITE_NAME} - ${normalized}` : DEFAULT_SITE_NAME;
}

export function getSiteNameParts(siteName: string): SiteNameParts {
  const dzematPrefix = `${DEFAULT_SITE_NAME} - `;

  if (!siteName.startsWith(dzematPrefix)) {
    return { brandName: siteName, dzematName: null };
  }

  const dzematName = siteName.slice(dzematPrefix.length).trim();

  return dzematName
    ? { brandName: DEFAULT_SITE_NAME, dzematName }
    : { brandName: siteName, dzematName: null };
}

export function getRootSiteName(matches: readonly unknown[]): string {
  const root = matches[0];
  if (!root || typeof root !== "object") return DEFAULT_SITE_NAME;

  const { loaderData } = root as { loaderData?: unknown };
  if (!loaderData || typeof loaderData !== "object") return DEFAULT_SITE_NAME;

  const { siteName } = loaderData as { siteName?: unknown };

  return typeof siteName === "string" ? siteName : DEFAULT_SITE_NAME;
}

export function getRootSiteUrl(matches: readonly unknown[]): string | undefined {
  const root = matches[0];
  if (!root || typeof root !== "object") return undefined;

  const { loaderData } = root as { loaderData?: unknown };
  if (!loaderData || typeof loaderData !== "object") return undefined;

  const { siteUrl } = loaderData as { siteUrl?: unknown };

  return typeof siteUrl === "string" ? siteUrl : undefined;
}

export function formatPageTitle(pageTitle: string, siteName = DEFAULT_SITE_NAME): string {
  return `${pageTitle} — ${siteName}`;
}

export function formatSiteDescription(siteName = DEFAULT_SITE_NAME): string {
  const { dzematName } = getSiteNameParts(siteName);
  const subject = dzematName
    ? `${DEFAULT_SITE_DESCRIPTION_PREFIX} ${dzematName}`
    : DEFAULT_SITE_DESCRIPTION_PREFIX;

  return `${subject} ${DEFAULT_SITE_DESCRIPTION_SUFFIX}`;
}

export function useRootSiteName(): string {
  const data = useRootLoaderData();

  return data?.siteName ?? DEFAULT_SITE_NAME;
}

export function useRootSiteUrl(): string | undefined {
  const data = useRootLoaderData();

  return data?.siteUrl;
}
