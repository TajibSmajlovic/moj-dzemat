import { redirect } from "react-router";

import { requireAdmin } from "#app/features/auth/auth.server";

import type { Route } from "./+types/admin._index";

/**
 * `/admin` is just a landing stub that punts to the posts list. We run
 * the auth guard again so an unauthenticated hit to `/admin` exactly
 * redirects to the login page instead of exposing the existence of the
 * posts index via a second redirect hop.
 */
export async function loader({ request }: Route.LoaderArgs) {
  await requireAdmin(request);
  return redirect("/admin/objave");
}
