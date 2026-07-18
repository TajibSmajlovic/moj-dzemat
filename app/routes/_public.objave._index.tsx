import { href, Link, redirect } from "react-router";

import { ChevronDown } from "lucide-react";
import { motion } from "motion/react";

import { PageMain } from "#app/components/layout/page-main";
import { BreadcrumbListJsonLd } from "#app/components/seo/breadcrumb-list-json-ld";
import { Button } from "#app/components/ui/button";
import { PostCard } from "#app/features/posts/components/post-card";
import { PostFilter } from "#app/features/posts/components/post-filter";
import { postsArchiveHref } from "#app/features/posts/post-routes";
import { formatPostArchiveTitle } from "#app/features/posts/post-type";
import {
  countPublicPosts,
  getActivePostType,
  getPublicPostCards,
} from "#app/features/posts/public-posts.server";
import {
  formatPageTitle,
  getRootSiteName,
  getRootSiteUrl,
  useRootSiteUrl,
} from "#app/lib/branding";
import { softFade } from "#app/lib/motion";
import {
  getLoadMorePaginationState,
  parsePageParam,
  PUBLIC_POSTS_PAGE_SIZE,
} from "#app/lib/pagination";
import {
  ROBOTS_MAX_IMAGE_PREVIEW_LARGE,
  ROBOTS_NOINDEX_FOLLOW,
  buildPublicPageMeta,
  formatDefaultSocialImageAlt,
  getDefaultSocialImageUrl,
} from "#app/lib/seo";
import { absoluteUrl } from "#app/lib/url";

import type { Route } from "./+types/_public.objave._index";

export function meta({ loaderData, matches }: Route.MetaArgs) {
  const siteName = getRootSiteName(matches);
  const siteUrl = getRootSiteUrl(matches);
  const title = formatPageTitle("Objave", siteName);
  const description = "Sve javne objave džemata na jednom mjestu.";
  const canonical = siteUrl ? absoluteUrl(siteUrl, href("/objave")) : href("/objave");
  const isFiltered = loaderData?.activeType && loaderData.activeType !== "all";

  return buildPublicPageMeta({
    title,
    description,
    canonical,
    siteName,
    imageUrl: getDefaultSocialImageUrl(siteUrl),
    imageAlt: formatDefaultSocialImageAlt(siteName),
    robots: isFiltered
      ? `${ROBOTS_NOINDEX_FOLLOW},${ROBOTS_MAX_IMAGE_PREVIEW_LARGE}`
      : ROBOTS_MAX_IMAGE_PREVIEW_LARGE,
  });
}

export async function loader({ url }: Route.LoaderArgs) {
  const activeType = getActivePostType(url);
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

  const siteUrl = useRootSiteUrl();
  const breadcrumbItems = siteUrl
    ? [
        { name: "Početna", url: absoluteUrl(siteUrl, href("/")) },
        { name: "Objave", url: absoluteUrl(siteUrl, href("/objave")) },
      ]
    : null;

  return (
    <>
      {breadcrumbItems ? <BreadcrumbListJsonLd items={breadcrumbItems} /> : null}

      <PageMain>
        <section className="mb-6 space-y-3 sm:mb-8 sm:space-y-4">
          <div className="space-y-1">
            <h1 className="font-display text-foreground text-2xl font-semibold text-balance sm:text-3xl">
              {archiveTitle}
            </h1>
            <p className="text-muted-foreground max-w-2xl text-sm leading-relaxed sm:text-base">
              Pregled svih obavijesti, hutbi, sergija, smrtovnica i priča.
            </p>
          </div>

          <PostFilter active={activeType} destination="archive" />
        </section>

        {posts.length > 0 ? (
          <>
            <section
              aria-label="Lista objava"
              className="grid gap-3.5 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3"
            >
              {posts.map((post, index) => (
                <PostCard
                  key={post.slug}
                  post={post}
                  priority={index === 0 && !!post.thumbnailId}
                />
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
      </PageMain>
    </>
  );
}
