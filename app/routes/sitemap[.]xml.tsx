import { ROUTES, absoluteUrl, postHref } from "#app/lib/routes";
import { MINUTE_SECONDS } from "#app/lib/time";
import { prisma } from "#app/server/db.server";
import { env } from "#app/server/env.server";

const MAX_ENTRIES = 10_000;
const SITEMAP_CACHE_SECONDS = 10 * MINUTE_SECONDS;

/**
   Dynamic sitemap. Small enough to fit in a single file so we don't
   bother with a sitemap index. Home page first, then each post by
   `updatedAt` (so Google re-crawls when content is edited).
 */
export async function loader() {
  const siteUrl = env().APP_URL;

  const posts = await prisma.post.findMany({
    where: { status: "published" },
    orderBy: { updatedAt: "desc" },
    take: MAX_ENTRIES,
    select: { slug: true, updatedAt: true },
  });
  const homepageLastmod = posts[0]?.updatedAt.toISOString();

  const urls = [
    { loc: absoluteUrl(siteUrl, ROUTES.home), lastmod: homepageLastmod },
    ...posts.map((post) => ({
      loc: absoluteUrl(siteUrl, postHref(post.slug)),
      lastmod: post.updatedAt.toISOString(),
    })),
  ];

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (entry) =>
      `  <url><loc>${escapeXml(entry.loc)}</loc>${
        entry.lastmod ? `<lastmod>${entry.lastmod}</lastmod>` : ""
      }</url>`,
  )
  .join("\n")}
</urlset>`;

  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": `public, max-age=${SITEMAP_CACHE_SECONDS}`,
    },
  });
}

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}
