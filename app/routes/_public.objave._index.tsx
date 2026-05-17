import { Link, redirect } from "react-router";

import { ChevronDown } from "lucide-react";
import { motion } from "motion/react";

import { Button } from "#app/components/ui/button";
import { PostCard } from "#app/features/posts/components/post-card";
import { PostFilter } from "#app/features/posts/components/post-filter";
import { formatPostArchiveTitle } from "#app/features/posts/post-type";
import {
  countPublicPosts,
  getActivePostType,
  getPublicPostCards,
} from "#app/features/posts/public-posts.server";
import { formatPageTitle, getRootSiteName, getRootSiteUrl } from "#app/lib/branding";
import { softFade } from "#app/lib/motion";
import {
  getLoadMorePaginationState,
  parsePageParam,
  PUBLIC_POSTS_PAGE_SIZE,
} from "#app/lib/pagination";
import { ROUTES, absoluteUrl, postsArchiveHref } from "#app/lib/routes";
import {
  ROBOTS_NOINDEX_FOLLOW,
  THEME_COLOR,
  buildSocialMeta,
  formatDefaultSocialImageAlt,
  getDefaultSocialImageUrl,
} from "#app/lib/seo";

import type { Route } from "./+types/_public.objave._index";

export function meta({ data, matches }: Route.MetaArgs) {
  const siteName = getRootSiteName(matches);
  const siteUrl = getRootSiteUrl(matches);
  const title = formatPageTitle("Objave", siteName);
  const description = "Sve javne objave džemata na jednom mjestu.";
  const canonical = siteUrl ? absoluteUrl(siteUrl, ROUTES.posts) : ROUTES.posts;
  const socialImageUrl = getDefaultSocialImageUrl(siteUrl);
  const isFiltered = data?.activeType && data.activeType !== "all";

  return [
    { title },
    { name: "description", content: description },
    { property: "og:type", content: "website" },
    { property: "og:site_name", content: siteName },
    { property: "og:locale", content: "bs_BA" },
    { property: "og:url", content: canonical },
    ...buildSocialMeta({
      title,
      description,
      imageUrl: socialImageUrl,
      imageAlt: formatDefaultSocialImageAlt(siteName),
    }),
    { name: "theme-color", content: THEME_COLOR },
    { tagName: "link", rel: "canonical", href: canonical },
    ...(isFiltered ? [{ name: "robots", content: ROBOTS_NOINDEX_FOLLOW }] : []),
  ];
}

export async function loader({ request }: Route.LoaderArgs) {
  const activeType = getActivePostType(request);
  const url = new URL(request.url);
  const page = parsePageParam(url.searchParams.get("page"));
  const totalPosts = await countPublicPosts({ activeType });
  const pagination = getLoadMorePaginationState({
    page,
    pageSize: PUBLIC_POSTS_PAGE_SIZE,
    totalItems: totalPosts,
  });

  if (pagination.totalPages > 0 && page > pagination.totalPages) {
    return redirect(postsArchiveHref({ page: pagination.totalPages, activeType }));
  }

  const posts =
    totalPosts > 0 ? await getPublicPostCards({ activeType, take: pagination.take }) : [];

  return { activeType, posts, pagination };
}

export default function ObjavePage({ loaderData }: Route.ComponentProps) {
  const { activeType, posts, pagination } = loaderData;
  const archiveTitle = formatPostArchiveTitle(activeType);

  return (
    <main className="mx-auto min-h-[40vh] max-w-5xl px-4 py-6 sm:py-8">
      <section className="mb-6 space-y-3 sm:mb-8 sm:space-y-4">
        <div className="space-y-1">
          <h1 className="font-display text-foreground text-2xl font-semibold text-balance sm:text-3xl">
            {archiveTitle}
          </h1>
          <p className="text-muted-foreground max-w-2xl text-sm leading-relaxed sm:text-base">
            Pregled svih obavijesti, hutbi, sergija i smrtovnica.
          </p>
        </div>

        <PostFilter active={activeType} basePath={ROUTES.posts} />
      </section>

      {posts.length > 0 ? (
        <>
          <section
            aria-label="Lista objava"
            className="grid gap-3.5 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3"
          >
            {posts.map((post, index) => (
              <PostCard key={post.slug} post={post} priority={index === 0 && !!post.thumbnailId} />
            ))}
          </section>

          {pagination.hasNextPage ? (
            <div className="mt-6 flex justify-center sm:mt-8">
              <Button asChild size="lg" className="rounded-full px-6 shadow-sm">
                <Link
                  to={postsArchiveHref({ page: pagination.page + 1, activeType })}
                  preventScrollReset
                  prefetch="intent"
                >
                  Učitaj više
                  <ChevronDown className="h-4 w-4" aria-hidden="true" />
                </Link>
              </Button>
            </div>
          ) : null}
        </>
      ) : (
        <motion.div {...softFade} className="py-20 text-center">
          <p className="text-muted-foreground text-lg text-pretty hyphens-auto">
            Nema objava u ovoj kategoriji.
          </p>
        </motion.div>
      )}
    </main>
  );
}
