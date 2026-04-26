import { useRef } from "react";
import { useMatches } from "react-router";

import Autoplay from "embla-carousel-autoplay";
import { AnimatePresence, motion } from "motion/react";

import { DzematLocationSection } from "#app/components/layout/dzemat-location-section";
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
import { getDzematLocation } from "#app/lib/maps";
import { plainExcerpt } from "#app/lib/post-excerpt";
import { isPostType, type PostTypeValue } from "#app/lib/post-type";
import { prisma } from "#app/utils/db.server";
import { env } from "#app/utils/env.server";

import type { Route } from "./+types/_public._index";

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
  const environment = env();

  const select = {
    slug: true,
    title: true,
    body: true,
    type: true,
    publishedAt: true,
    pinned: true,
    featured: true,
    images: { orderBy: { position: "asc" }, take: 1, select: { id: true } },
  } as const;

  const featuredPromise = prisma.post.findMany({
    where: { featured: true, status: "published" },
    orderBy: [{ pinned: "desc" }, { createdAt: "desc" }],
    take: 5, // TODO: maybe make this configurable
    select,
  });

  const postsPromise = prisma.post.findMany({
    where:
      activeType === "all" ? { status: "published" } : { status: "published", type: activeType },
    orderBy: [{ pinned: "desc" }, { createdAt: "desc" }],
    select,
  });

  const [featured, posts] = await Promise.all([featuredPromise, postsPromise]);

  return {
    featured: featured.map((post) => toCard(post)),
    posts: posts.map((post) => toCard(post)),
    activeType,
    location: getDzematLocation({
      address: environment.DZEMAT_ADDRESS,
      query: environment.DZEMAT_MAP_QUERY,
    }),
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
    excerpt: plainExcerpt(post.body),
    type: post.type as PostTypeValue,
    publishedAt: post.publishedAt,
    pinned: post.pinned,
    thumbnailId: post.images[0]?.id ?? null,
  };
}

export default function HomePage({ loaderData }: Route.ComponentProps) {
  const { posts, featured, activeType, location } = loaderData;
  const siteName = getSiteNameFromMatches(useMatches());

  return (
    <main className="mx-auto max-w-5xl px-4 py-6 sm:py-8">
      {featured.length > 0 ? <Featured featured={featured} /> : null}

      <motion.section
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.4 }}
        className="mb-6 space-y-3 sm:mb-8 sm:space-y-4"
      >
        <h2 className="font-display text-foreground text-lg font-semibold text-balance sm:text-xl">
          Objave
        </h2>
        <PostFilter active={activeType} />
      </motion.section>

      {posts.length > 0 ? (
        <section
          aria-label="Lista objava"
          className="grid gap-3.5 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3"
        >
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

      {location ? <DzematLocationSection location={location} siteName={siteName} /> : null}
    </main>
  );
}

function Featured({ featured }: { featured: PostCardData[] }) {
  const autoplay = useRef(
    Autoplay({ delay: 7000, stopOnInteraction: false, stopOnMouseEnter: true }),
  );

  if (featured.length === 1 && featured[0]) {
    return (
      <section aria-label="Istaknuta objava" className="mb-8 sm:mb-10">
        <FeaturedHeroCard
          post={{
            slug: featured[0].slug,
            title: featured[0].title,
            excerpt: featured[0].excerpt,
            type: featured[0].type,
            publishedAt: featured[0].publishedAt,
          }}
        />
      </section>
    );
  }

  return (
    <section aria-label="Istaknute objave" className="mb-8 sm:mb-10">
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
  );
}
