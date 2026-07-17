import { ROUTES, absoluteUrl } from "#app/lib/routes";
import { HOUR_SECONDS } from "#app/lib/time";
import { env } from "#app/server/env.server";

/**
   Minimal robots.txt. Public pages and images are indexable; admin and auth
   routes are not.
 */
export function loader() {
  const body = [
    "User-agent: *",
    `Allow: ${ROUTES.home}`,
    `Disallow: ${ROUTES.admin}`,
    `Disallow: ${ROUTES.admin}/`,
    `Disallow: ${ROUTES.login}`,
    `Disallow: ${ROUTES.logout}`,
    `Disallow: ${ROUTES.forgotPassword}`,
    `Disallow: ${ROUTES.newPassword}/`,
    "",
    `Sitemap: ${absoluteUrl(env().APP_URL, ROUTES.sitemapXml)}`,
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
