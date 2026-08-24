import { href, Link } from "react-router";

import { Pencil } from "lucide-react";

import { PageMain } from "#app/components/layout/page-main";
import { SegmentErrorBoundary } from "#app/components/layout/segment-error-boundary";
import { BreadcrumbListJsonLd } from "#app/components/seo/breadcrumb-list-json-ld";
import { ShareButton } from "#app/components/share-button";
import { BackButton } from "#app/components/ui/back-link";
import { Button } from "#app/components/ui/button";
import { PostDetailArticle } from "#app/features/posts/components/post-detail-article";
import { adminPostHref, postHref } from "#app/features/posts/post-routes";
import { buildPostPageMeta } from "#app/features/posts/post-seo";
import { PostSnapshotCapture } from "#app/features/pwa/post-snapshot-capture";
import { formatPageTitle, getRootSiteName } from "#app/lib/branding";
import { invariantResponse } from "#app/lib/invariant";
import { absoluteUrl } from "#app/lib/url";
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
      videos: {
        orderBy: { position: "asc" },
        select: { id: true, providerId: true },
      },
    },
  });

  invariantResponse(post, "Objava nije pronađena.", { status: 404 });

  return { post, siteUrl: env().APP_URL };
}

export function meta({ loaderData, matches }: Route.MetaArgs) {
  const siteName = getRootSiteName(matches);

  if (!loaderData) {
    return [{ title: formatPageTitle("Objava nije pronađena", siteName) }];
  }

  const { post, siteUrl } = loaderData;
  return buildPostPageMeta({ post, siteName, siteUrl });
}

export default function PostDetailPage({ loaderData, matches }: Route.ComponentProps) {
  const { post, siteUrl } = loaderData;
  const siteName = getRootSiteName(matches);
  const { isAdminLoggedIn } = matches[1].loaderData;

  return (
    <PageMain className="max-w-3xl py-3 sm:py-6">
      <PostSnapshotCapture post={post} />

      <div className="flex items-center justify-between">
        <BackButton fallback={href("/")} label="Nazad na listu" />

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

      <BreadcrumbListJsonLd
        items={[
          { name: "Početna", url: absoluteUrl(siteUrl, href("/")) },
          { name: "Objave", url: absoluteUrl(siteUrl, href("/objave")) },
          { name: post.title, url: absoluteUrl(siteUrl, postHref(post.slug)) },
        ]}
      />
    </PageMain>
  );
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  return (
    <PageMain className="max-w-3xl py-3 sm:py-6">
      <SegmentErrorBoundary
        error={error}
        backTo={href("/objave")}
        backLabel="Pregled svih objava"
      />
    </PageMain>
  );
}
