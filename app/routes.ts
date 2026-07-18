import type { RouteConfig } from "@react-router/dev/routes";
import { flatRoutes } from "@react-router/fs-routes";

// Runtime access is gated by ENABLE_TEST_ROUTES inside the route loader. This
// build-only flag controls route inclusion; standalone typegen leaves it unset.
export default flatRoutes({
  ignoredRouteFiles: process.env.OMIT_DEV_ROUTES === "true" ? ["**/dev.last-email.tsx"] : [],
}) satisfies RouteConfig;
