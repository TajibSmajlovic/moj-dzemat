import { useRouteLoaderData } from "react-router";

import type { loader as rootLoader } from "#app/root";

/** Root loader data inferred from the route module, shared by descendant UI hooks. */
export function useRootLoaderData() {
  return useRouteLoaderData<typeof rootLoader>("root");
}

export function getRootSiteUrl(matches: readonly unknown[]): string | undefined {
  const root = matches[0];
  if (!root || typeof root !== "object") return undefined;

  const { loaderData } = root as { loaderData?: unknown };
  if (!loaderData || typeof loaderData !== "object") return undefined;

  const { siteUrl } = loaderData as { siteUrl?: unknown };

  return typeof siteUrl === "string" ? siteUrl : undefined;
}

export function useRootSiteUrl(): string | undefined {
  const data = useRootLoaderData();

  return data?.siteUrl;
}
