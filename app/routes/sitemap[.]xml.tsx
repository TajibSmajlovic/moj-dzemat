import { postHref, postImageHref } from "#app/features/posts/post-routes";
import { qaQuestionHref } from "#app/features/qa/qa-routes";
import { getPublicAnsweredQuestionSitemap } from "#app/features/qa/qa.server";
import { ROUTES, absoluteUrl } from "#app/lib/routes";
import { MINUTE_SECONDS } from "#app/lib/time";
import { prisma } from "#app/server/db.server";
import { env } from "#app/server/env.server";

const MAX_ENTRIES = 10_000;
const SITEMAP_CACHE_SECONDS = 10 * MINUTE_SECONDS;
const STATIC_ENTRY_COUNT = 2;
// Keep answered Q&A pages from being crowded out by a large post archive.
const RESERVED_QA_DYNAMIC_ENTRIES = 1000;

/**
   Dynamic sitemap. Small enough to fit in a single file so we don't
   bother with a sitemap index. Home page and Q&A list come first, then
   posts by `updatedAt` and visible answered questions by `answeredAt`.
   Public post images are attached with the Google image sitemap extension.
 */
export async function loader() {
  const siteUrl = env().APP_URL;
  const dynamicEntryLimit = Math.max(MAX_ENTRIES - STATIC_ENTRY_COUNT, 0);
  const questionEntryLimit = Math.min(RESERVED_QA_DYNAMIC_ENTRIES, dynamicEntryLimit);
  const qaSitemap = await getPublicAnsweredQuestionSitemap({ take: questionEntryLimit });
  const postEntryLimit = Math.max(dynamicEntryLimit - qaSitemap.questions.length, 0);

  const posts = await prisma.post.findMany({
    where: { status: "published" },
    orderBy: { updatedAt: "desc" },
    take: postEntryLimit,
    select: {
      slug: true,
      updatedAt: true,
      images: { orderBy: { position: "asc" }, select: { id: true } },
    },
  });
  const homepageLastmod = newestDate(posts[0]?.updatedAt, qaSitemap.lastAnsweredAt)?.toISOString();
  const qaLastmod = qaSitemap.lastAnsweredAt?.toISOString();

  const urls = [
    { loc: absoluteUrl(siteUrl, ROUTES.home), lastmod: homepageLastmod },
    { loc: absoluteUrl(siteUrl, ROUTES.qa), lastmod: qaLastmod },
    ...posts.map((post) => ({
      loc: absoluteUrl(siteUrl, postHref(post.slug)),
      lastmod: post.updatedAt.toISOString(),
      images: post.images.map((image) => ({
        loc: absoluteUrl(siteUrl, postImageHref(image.id)),
      })),
    })),
    ...qaSitemap.questions.map((question) => ({
      loc: absoluteUrl(siteUrl, qaQuestionHref(question.id)),
      lastmod: question.answeredAt.toISOString(),
    })),
  ];

  const body = buildSitemapXml(urls);

  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": `public, max-age=${SITEMAP_CACHE_SECONDS}`,
    },
  });
}

type SitemapEntry = {
  loc: string;
  lastmod?: string;
  images?: { loc: string }[];
};

export function buildSitemapXml(entries: SitemapEntry[]): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${entries.map((element) => formatSitemapEntry(element)).join("\n")}
</urlset>`;
}

function formatSitemapEntry(entry: SitemapEntry): string {
  const imageTags = entry.images?.map((element) => formatSitemapImage(element)).join("") ?? "";

  return `  <url><loc>${escapeXml(entry.loc)}</loc>${
    entry.lastmod ? `<lastmod>${entry.lastmod}</lastmod>` : ""
  }${imageTags}</url>`;
}

function formatSitemapImage(image: { loc: string }): string {
  return `<image:image><image:loc>${escapeXml(image.loc)}</image:loc></image:image>`;
}

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function newestDate(...dates: (Date | null | undefined)[]): Date | undefined {
  let newest: Date | undefined;

  for (const date of dates) {
    if (date instanceof Date && (!newest || date > newest)) {
      newest = date;
    }
  }

  return newest;
}
