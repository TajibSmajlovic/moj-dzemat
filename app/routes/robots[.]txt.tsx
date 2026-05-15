import { env } from "#app/server/env.server";

/**
 * Minimal robots.txt. Public feed, post pages and images are indexable;
 * admin area and auth routes are not.
 */
export function loader() {
  const body = [
    "User-agent: *",
    "Allow: /",
    "Disallow: /admin",
    "Disallow: /admin/",
    "Disallow: /prijava",
    "Disallow: /odjava",
    "Disallow: /zaboravljena-lozinka",
    "Disallow: /nova-lozinka/",
    "",
    `Sitemap: ${env().APP_URL}/sitemap.xml`,
    "",
  ].join("\n");

  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
