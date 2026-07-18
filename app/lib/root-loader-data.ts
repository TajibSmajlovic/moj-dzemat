import { useRouteLoaderData } from "react-router";

import type { loader as rootLoader } from "#app/root";

/** Root loader data inferred from the route module, shared by descendant UI hooks. */
export function useRootLoaderData() {
  return useRouteLoaderData<typeof rootLoader>("root");
}
