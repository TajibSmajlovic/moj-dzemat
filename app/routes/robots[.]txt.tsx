import { env } from "#app/utils/env.server";

/**
 * Minimal robots.txt. Public feed + post pages are indexable; admin
 * area and the per-image byte route are not (no linking surfaces, but
 * explicit disallow lines save crawler budget).
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
    "Disallow: /slike/",
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
