import type { RouteConfig } from "@react-router/dev/routes";
import { flatRoutes } from "@react-router/fs-routes";

export default flatRoutes({
  ignoredRouteFiles: process.env.ENABLE_TEST_ROUTES === "false" ? ["**/dev.last-email.tsx"] : [],
}) satisfies RouteConfig;
