import type { MiddlewareFunction } from "react-router";

import { adminUserContext } from "#app/features/auth/auth-context";
import { requireAdmin } from "#app/features/auth/auth.server";

/**
   Authenticates the complete `/admin` route branch once and makes the
   resulting user available to every matched admin loader/action.
 */
export const adminAuthMiddleware: MiddlewareFunction<Response> = async (
  { request, url, context },
  next,
) => {
  const user = await requireAdmin(request, url);
  context.set(adminUserContext, user);

  return next();
};
