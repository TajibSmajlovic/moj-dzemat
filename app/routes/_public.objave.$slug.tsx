import { Link, useLocation, useNavigate } from "react-router";

import { ArrowLeft, Pencil } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";

import { PostDetailArticle } from "#app/components/posts/post-detail-article";
import { ShareButton } from "#app/components/posts/share-button";
import { Button } from "#app/components/ui/button";
import { formatPageTitle, getRootSiteName, useRootSiteName } from "#app/lib/branding";
import { plainExcerpt } from "#app/lib/post-excerpt";
import { getCurrentUser } from "#app/utils/auth.server.js";
import { prisma } from "#app/utils/db.server";
import { env } from "#app/utils/env.server";

import type { Route } from "./+types/_public.objave.$slug";

export async function loader({ params, request }: Route.LoaderArgs) {
  const isAdminLoggedIn = (await getCurrentUser(request)) !== null;
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

  if (!post) {
    throw new Response("Objava nije pronađena.", { status: 404 });
  }

  return { post, siteUrl: env().APP_URL, isAdminLoggedIn };
}

export function meta({ data, matches }: Route.MetaArgs) {
  const siteName = getRootSiteName(matches);

  if (!data) {
    return [{ title: formatPageTitle("Objava nije pronađena", siteName) }];
  }

  const { post, siteUrl } = data;
  const description = plainExcerpt(post.body);
  const canonical = `${siteUrl}/objave/${post.slug}`;
  const primaryImage = post.images[0];
  const imageUrl = primaryImage ? `${siteUrl}/slike/${primaryImage.id}` : null;

  return [
    { title: formatPageTitle(post.title, siteName) },
    { name: "description", content: description },
    { property: "og:title", content: post.title },
    { property: "og:description", content: description },
    { property: "og:type", content: "article" },
    { property: "og:site_name", content: siteName },
    { property: "og:locale", content: "bs_BA" },
    { property: "og:url", content: canonical },
    { property: "og:image", content: imageUrl ?? `${siteUrl}/logo.png` },
    ...(primaryImage?.altText ? [{ property: "og:image:alt", content: primaryImage.altText }] : []),
    ...(primaryImage?.width
      ? [{ property: "og:image:width", content: String(primaryImage.width) }]
      : []),
    ...(primaryImage?.height
      ? [{ property: "og:image:height", content: String(primaryImage.height) }]
      : []),
    { tagName: "link", rel: "canonical", href: canonical },
  ];
}

export default function PostDetailPage({ loaderData }: Route.ComponentProps) {
  const { post, siteUrl, isAdminLoggedIn } = loaderData;
  const navigate = useNavigate();
  const location = useLocation();

  const fromList = (location.state as { fromList?: boolean } | null)?.fromList === true;
  const siteName = useRootSiteName();

  return (
    <AnimatePresence>
      <motion.main
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="mx-auto max-w-3xl px-4 py-3 sm:py-6"
      >
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          className="mb-4 sm:mb-6"
        >
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              type="button"
              onClick={() => (fromList ? void navigate(-1) : void navigate("/"))}
              className="text-muted-foreground hover:text-foreground inline-flex items-center gap-2 text-sm font-medium transition-colors"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              Nazad na listu
            </Button>

            <div className="flex flex-wrap items-center gap-2">
              {isAdminLoggedIn ? (
                <Button variant="outline" size="sm" className="gap-2" asChild>
                  <Link to={`/admin/objave/${post.id}`}>
                    <Pencil className="h-4 w-4" aria-hidden="true" />
                    Uredi
                  </Link>
                </Button>
              ) : null}

              <ShareButton />
            </div>
          </div>
        </motion.div>

        <PostDetailArticle
          post={post}
          siteName={siteName}
          siteUrl={siteUrl}
          showPinnedBadge={isAdminLoggedIn}
          showStructuredData
        />
      </motion.main>
    </AnimatePresence>
  );
}
