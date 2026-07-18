import { href } from "react-router";

import { HOUR_SECONDS } from "#app/lib/time";
import { absoluteUrl } from "#app/lib/url";
import { env } from "#app/server/env.server";

/**
   Minimal robots.txt. Public pages and images are indexable; admin and auth
   routes are not.
 */
export function loader() {
  const body = [
    "User-agent: *",
    `Allow: ${href("/")}`,
    `Disallow: ${href("/admin")}`,
    "Disallow: /admin/",
    `Disallow: ${href("/prijava")}`,
    `Disallow: ${href("/odjava")}`,
    `Disallow: ${href("/zaboravljena-lozinka")}`,
    "Disallow: /nova-lozinka/",
    "",
    `Sitemap: ${absoluteUrl(env().APP_URL, href("/sitemap.xml"))}`,
    "",
  ].join("\n");

  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": `public, max-age=${HOUR_SECONDS}`,
    },
  });
}
