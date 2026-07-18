import type { RouteConfig } from "@react-router/dev/routes";
import { flatRoutes } from "@react-router/fs-routes";

// Standalone typegen includes dev routes; the production build explicitly opts out.
export default flatRoutes({
  ignoredRouteFiles: process.env.OMIT_DEV_ROUTES === "true" ? ["**/dev.last-email.tsx"] : [],
}) satisfies RouteConfig;
