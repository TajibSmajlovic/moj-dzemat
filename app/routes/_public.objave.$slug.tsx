import { Link, useRouteLoaderData } from "react-router";

import { Pencil } from "lucide-react";

import { SegmentErrorBoundary } from "#app/components/layout/segment-error-boundary";
import { BackButton } from "#app/components/ui/back-link";
import { Button } from "#app/components/ui/button";
import { PostDetailArticle } from "#app/features/posts/components/post-detail-article";
import { ShareButton } from "#app/features/posts/components/share-button";
import { plainExcerpt } from "#app/features/posts/post-excerpt";
import { formatPageTitle, getRootSiteName, useRootSiteName } from "#app/lib/branding";
import { invariantResponse } from "#app/lib/invariant";
import { ROUTES, absoluteUrl, adminPostHref, postHref, postImageHref } from "#app/lib/routes";
import {
  THEME_COLOR,
  buildSocialMeta,
  formatDefaultSocialImageAlt,
  getDefaultSocialImageUrl,
} from "#app/lib/seo";
import { prisma } from "#app/server/db.server";
import { env } from "#app/server/env.server";

import type { Route } from "./+types/_public.objave.$slug";

export async function loader({ params }: Route.LoaderArgs) {
  const post = await prisma.post.findFirst({
    where: { slug: params.slug, status: "published" },
    select: {
      id: true,
      slug: true,
      title: true,
      body: true,
      type: true,
      publishedAt: true,
      updatedAt: true,
      pinned: true,
      images: {
        orderBy: { position: "asc" },
        select: { id: true, altText: true, width: true, height: true },
      },
    },
  });

  invariantResponse(post, "Objava nije pronađena.", { status: 404 });

  return { post, siteUrl: env().APP_URL };
}

export function meta({ data, matches }: Route.MetaArgs) {
  const siteName = getRootSiteName(matches);

  if (!data) {
    return [{ title: formatPageTitle("Objava nije pronađena", siteName) }];
  }

  const { post, siteUrl } = data;
  const description = plainExcerpt(post.body);
  const canonical = absoluteUrl(siteUrl, postHref(post.slug));
  const primaryImage = post.images[0];
  const imageUrl = primaryImage
    ? absoluteUrl(siteUrl, postImageHref(primaryImage.id))
    : getDefaultSocialImageUrl(siteUrl);
  const imageAlt =
    primaryImage?.altText ?? (primaryImage ? post.title : formatDefaultSocialImageAlt(siteName));

  return [
    { title: formatPageTitle(post.title, siteName) },
    { name: "description", content: description },
    { name: "theme-color", content: THEME_COLOR },
    { property: "og:type", content: "article" },
    { property: "og:site_name", content: siteName },
    { property: "og:locale", content: "bs_BA" },
    { property: "og:url", content: canonical },
    ...buildSocialMeta({
      title: post.title,
      description,
      imageUrl,
      imageAlt,
      imageWidth: primaryImage?.width,
      imageHeight: primaryImage?.height,
    }),
    { tagName: "link", rel: "canonical", href: canonical },
  ];
}

export default function PostDetailPage({ loaderData }: Route.ComponentProps) {
  const { post, siteUrl } = loaderData;
  const siteName = useRootSiteName();
  const layoutData = useRouteLoaderData<{ isAdminLoggedIn: boolean }>("routes/_public");
  const isAdminLoggedIn = layoutData?.isAdminLoggedIn ?? false;

  return (
    <main className="mx-auto max-w-3xl px-4 py-3 sm:py-6">
      <div className="flex items-center justify-between">
        <BackButton fallback={ROUTES.home} label="Nazad na listu" />

        <div className="flex flex-wrap items-center gap-2">
          {isAdminLoggedIn ? (
            <Button variant="outline" size="sm" className="gap-2" asChild>
              <Link to={adminPostHref(post.id)}>
                <Pencil className="h-4 w-4" aria-hidden="true" />
                Uredi
              </Link>
            </Button>
          ) : null}

          <ShareButton />
        </div>
      </div>

      <PostDetailArticle
        post={post}
        siteName={siteName}
        siteUrl={siteUrl}
        showPinnedBadge={isAdminLoggedIn}
        showStructuredData
      />
    </main>
  );
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  return (
    <main className="mx-auto max-w-3xl px-4 py-3 sm:py-6">
      <SegmentErrorBoundary error={error} backTo={ROUTES.posts} backLabel="Pregled svih objava" />
    </main>
  );
}
