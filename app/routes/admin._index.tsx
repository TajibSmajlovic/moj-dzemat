import { href, redirect } from "react-router";

import { adminUserContext } from "#app/features/auth/auth-context";

import type { Route } from "./+types/admin._index";

/** `/admin` is a landing stub that sends authenticated admins to posts. */
export function loader({ context }: Route.LoaderArgs) {
  context.get(adminUserContext);

  return redirect(href("/admin/objave"));
}
