import { useRef } from "react";

import Autoplay from "embla-carousel-autoplay";
import { AnimatePresence, motion } from "motion/react";

import { FeaturedHeroCard } from "#app/components/posts/featured-hero-card";
import { PostCard, type PostCardData } from "#app/components/posts/post-card";
import { PostFilter } from "#app/components/posts/post-filter";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "#app/components/ui/carousel";
import { getSiteNameFromMatches } from "#app/lib/branding";
import { isPostType, type PostTypeValue } from "#app/lib/post-type";
import { prisma } from "#app/utils/db.server";

import type { Route } from "./+types/_public._index";

const EXCERPT_MAX_CHARS = 220;
const FEATURED_LIMIT = 5;

export function meta({ matches }: Route.MetaArgs) {
  const siteName = getSiteNameFromMatches(matches);

  return [
    { title: siteName },
    {
      name: "description",
      content: "Obavijesti, smrtovnice, sergije i hutbe džemata na jednom mjestu.",
    },
    { property: "og:title", content: siteName },
    { property: "og:type", content: "website" },
  ];
}

export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const rawType = url.searchParams.get("vrsta");
  const activeType: PostTypeValue | "all" = isPostType(rawType) ? rawType : "all";

  const featured = await prisma.post.findMany({
    where: { featured: true },
    orderBy: [{ pinned: "desc" }, { createdAt: "desc" }],
    take: FEATURED_LIMIT,
    select: {
      slug: true,
      title: true,
      body: true,
      type: true,
      publishedAt: true,
      pinned: true,
      featured: true,
      images: { orderBy: { position: "asc" }, take: 1, select: { id: true } },
    },
  });

  const posts = await prisma.post.findMany({
    where: activeType === "all" ? {} : { type: activeType },
    orderBy: [{ pinned: "desc" }, { createdAt: "desc" }],
    select: {
      slug: true,
      title: true,
      body: true,
      type: true,
      publishedAt: true,
      pinned: true,
      featured: true,
      images: { orderBy: { position: "asc" }, take: 1, select: { id: true } },
    },
  });

  return {
    featured: featured.map((post) => toCard(post)),
    posts: posts.map((post) => toCard(post)),
    activeType,
  };
}

function toCard(post: {
  slug: string;
  title: string;
  body: string;
  type: string;
  publishedAt: Date;
  pinned: boolean;
  images: { id: string }[];
}): PostCardData {
  return {
    slug: post.slug,
    title: post.title,
    excerpt: excerpt(post.body),
    type: post.type as PostTypeValue,
    publishedAt: post.publishedAt,
    pinned: post.pinned,
    thumbnailId: post.images[0]?.id ?? null,
  };
}

function excerpt(body: string): string {
  const plain = body.replaceAll(/<[^>]*>/g, "");
  const normalized = plain.replaceAll(/\s+/g, " ").trim();
  if (normalized.length <= EXCERPT_MAX_CHARS) return normalized;

  return `${normalized.slice(0, EXCERPT_MAX_CHARS).trimEnd()}…`;
}

export default function HomePage({ loaderData }: Route.ComponentProps) {
  const { posts, featured, activeType } = loaderData;

  const autoplay = useRef(
    Autoplay({ delay: 7000, stopOnInteraction: false, stopOnMouseEnter: true }),
  );

  const heroPost = featured.length === 1 ? featured[0] : null;
  const hasMultipleFeatured = featured.length > 1;

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      {heroPost ? (
        <section aria-label="Istaknuta objava" className="mb-10">
          <FeaturedHeroCard
            post={{
              slug: heroPost.slug,
              title: heroPost.title,
              excerpt: heroPost.excerpt,
              type: heroPost.type,
              publishedAt: heroPost.publishedAt,
            }}
          />
        </section>
      ) : null}

      {hasMultipleFeatured && (
        <section aria-label="Istaknute objave" className="mb-10">
          <Carousel className="w-full" opts={{ loop: true }} plugins={[autoplay.current]}>
            <CarouselContent className="items-stretch">
              {featured.map((post) => (
                <CarouselItem key={post.slug} className="h-auto">
                  <div className="h-full">
                    <FeaturedHeroCard
                      post={{
                        slug: post.slug,
                        title: post.title,
                        excerpt: post.excerpt,
                        type: post.type,
                        publishedAt: post.publishedAt,
                      }}
                    />
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious />
            <CarouselNext />
          </Carousel>
        </section>
      )}

      <motion.section
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.4 }}
        className="mb-8 space-y-4"
      >
        <h2 className="font-display text-foreground text-xl font-semibold text-balance">Objave</h2>
        <PostFilter active={activeType} />
      </motion.section>

      {posts.length > 0 ? (
        <section aria-label="Lista objava" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <AnimatePresence mode="popLayout">
            {posts.map((post, index) => (
              <PostCard key={post.slug} post={post} index={index} />
            ))}
          </AnimatePresence>
        </section>
      ) : (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-20 text-center">
          <p className="text-muted-foreground text-lg text-pretty hyphens-auto">
            Nema objava u ovoj kategoriji.
          </p>
        </motion.div>
      )}
    </main>
  );
}
