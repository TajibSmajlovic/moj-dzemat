import { motion } from "motion/react";

import { PostCard } from "#app/components/posts/post-card";
import { PostFilter } from "#app/components/posts/post-filter";
import { formatPageTitle, getRootSiteName, getRootSiteUrl } from "#app/lib/branding";
import { softFade } from "#app/lib/motion";
import {
  ROBOTS_NOINDEX_FOLLOW,
  THEME_COLOR,
  buildSocialMeta,
  formatDefaultSocialImageAlt,
  getDefaultSocialImageUrl,
} from "#app/lib/seo";
import { getActivePostType, getPublicPostCards } from "#app/utils/public-posts.server";

import type { Route } from "./+types/_public.objave._index";

export function meta({ data, matches }: Route.MetaArgs) {
  const siteName = getRootSiteName(matches);
  const siteUrl = getRootSiteUrl(matches);
  const title = formatPageTitle("Objave", siteName);
  const description = "Sve javne objave džemata na jednom mjestu.";
  const canonical = siteUrl ? `${siteUrl}/objave` : "/objave";
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
  const posts = await getPublicPostCards({ activeType });

  return { activeType, posts };
}

export default function ObjavePage({ loaderData }: Route.ComponentProps) {
  const { activeType, posts } = loaderData;

  return (
    <main className="mx-auto min-h-[40vh] max-w-5xl px-4 py-6 sm:py-8">
      <section className="mb-6 space-y-3 sm:mb-8 sm:space-y-4">
        <div className="space-y-1">
          <h1 className="font-display text-foreground text-2xl font-semibold text-balance sm:text-3xl">
            Sve objave
          </h1>
          <p className="text-muted-foreground max-w-2xl text-sm leading-relaxed sm:text-base">
            Pregled svih obavijesti, hutbi, sergija i smrtovnica.
          </p>
        </div>

        <PostFilter active={activeType} basePath="/objave" />
      </section>

      {posts.length > 0 ? (
        <section
          aria-label="Lista objava"
          className="grid gap-3.5 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3"
        >
          {posts.map((post, index) => (
            <PostCard key={post.slug} post={post} priority={index === 0 && !!post.thumbnailId} />
          ))}
        </section>
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
