import { href, redirect } from "react-router";

import { logout } from "#app/features/auth/auth.server";

import type { Route } from "./+types/odjava";

/**
   Logout is POST-only so a rogue link/img tag can't force a logout via
   CSRF-like trickery. A GET request returns 405.
 */
export async function action({ request }: Route.ActionArgs) {
  const headers = await logout(request);

  return redirect(href("/"), { headers });
}

export function loader() {
  throw new Response("Metoda nije dozvoljena.", {
    status: 405,
    headers: { Allow: "POST" },
  });
}
