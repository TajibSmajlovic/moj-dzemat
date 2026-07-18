import { RouterContextProvider } from "react-router";

import { adminUserContext, type CurrentUser } from "#app/features/auth/auth-context";

import { createUser } from "../factories";
import { sessionCookieFor } from "./session";

type CreateAdminSessionOptions = Parameters<typeof createUser>[0];
export type AdminRouteContext = RouterContextProvider;

function createAdminContext(user: CurrentUser) {
  const context = new RouterContextProvider();
  context.set(adminUserContext, user);

  return context;
}

export async function createAdminSession(options: CreateAdminSessionOptions = {}) {
  const { user, password } = await createUser(options);
  const cookie = await sessionCookieFor(user.id);
  const context = createAdminContext(user);

  return { user, password, cookie, context };
}
