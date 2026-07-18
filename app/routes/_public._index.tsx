import { useMemo } from "react";
import { href, Link } from "react-router";

import Autoplay from "embla-carousel-autoplay";
import { ArrowRight } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";

import { DzematLocationSection } from "#app/components/layout/dzemat-location-section";
import { PageMain } from "#app/components/layout/page-main";
import { HomeStructuredData } from "#app/components/seo/home-structured-data";
import { Button } from "#app/components/ui/button";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "#app/components/ui/carousel";
import { ImportantDatesHomeSection } from "#app/features/important-dates/components/important-dates-home-section";
import { getUpcomingImportantDates } from "#app/features/important-dates/important-dates.server";
import { FeaturedHeroCard } from "#app/features/posts/components/featured-hero-card";
import { PostCard, type PostCardData } from "#app/features/posts/components/post-card";
import { PostFilter } from "#app/features/posts/components/post-filter";
import { formatLatestPostsTitle } from "#app/features/posts/post-type";
import {
  getActivePostType,
  getFeaturedPostCards,
  getPublicPostCards,
  HOME_POST_LIMIT,
} from "#app/features/posts/public-posts.server";
import { QaHomePreview } from "#app/features/qa/components/qa-home-preview";
import { getPublicAnsweredQuestions, QA_HOME_PREVIEW_LIMIT } from "#app/features/qa/qa.server";
import {
  formatSiteDescription,
  getRootSiteName,
  getRootSiteUrl,
  useRootSiteName,
  useRootSiteUrl,
} from "#app/lib/branding";
import { getDzematLocation } from "#app/lib/maps";
import { softFade } from "#app/lib/motion";
import {
  ROBOTS_MAX_IMAGE_PREVIEW_LARGE,
  ROBOTS_NOINDEX_FOLLOW,
  buildPublicPageMeta,
  formatDefaultSocialImageAlt,
  getDefaultSocialImageUrl,
} from "#app/lib/seo";
import { useRootFacebookPageUrl } from "#app/lib/social-links";
import { absoluteUrl } from "#app/lib/url";
import { env } from "#app/server/env.server";

import type { Route } from "./+types/_public._index";

export function meta({ loaderData, matches }: Route.MetaArgs) {
  const siteName = getRootSiteName(matches);
  const siteDescription = formatSiteDescription(siteName);
  const siteUrl = getRootSiteUrl(matches);
  const canonical = siteUrl ? absoluteUrl(siteUrl, href("/")) : href("/");
  const isFiltered = loaderData?.activeType && loaderData.activeType !== "all";

  return buildPublicPageMeta({
    title: siteName,
    description: siteDescription,
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
  const environment = env();

  const featuredPromise = getFeaturedPostCards();
  const postsPromise = getPublicPostCards({ activeType, take: HOME_POST_LIMIT });
  const qaPreviewPromise = getPublicAnsweredQuestions({ take: QA_HOME_PREVIEW_LIMIT });
  const importantDatesPromise = getUpcomingImportantDates();

  const [featured, posts, qaPreview, importantDates] = await Promise.all([
    featuredPromise,
    postsPromise,
    qaPreviewPromise,
    importantDatesPromise,
  ]);

  return {
    featured,
    posts,
    qaPreview,
    importantDates,
    activeType,
    location: getDzematLocation({
      address: environment.DZEMAT_ADDRESS,
      query: environment.DZEMAT_MAP_QUERY,
    }),
  };
}

export default function HomePage({ loaderData }: Route.ComponentProps) {
  const { posts, featured, qaPreview, importantDates, activeType, location } = loaderData;
  const siteName = useRootSiteName();
  const siteUrl = useRootSiteUrl();
  const facebookPageUrl = useRootFacebookPageUrl();
  const latestTitle = formatLatestPostsTitle(activeType);

  return (
    <>
      {siteUrl ? (
        <HomeStructuredData
          facebookPageUrl={facebookPageUrl}
          location={location}
          siteName={siteName}
          siteUrl={siteUrl}
        />
      ) : null}

      <PageMain className="pb-0 sm:pb-0">
        {featured.length > 0 ? <Featured featured={featured} /> : null}

        <section className="mb-6 space-y-3 sm:mb-8 sm:space-y-4">
          <h2 className="font-display text-foreground text-lg font-semibold text-balance sm:text-xl">
            {latestTitle}
          </h2>
          <PostFilter active={activeType} />
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

        <div className="mt-6 flex justify-center sm:mt-8">
          <Button asChild size="lg" className="rounded-full px-6 shadow-sm">
            <Link to={href("/objave")} prefetch="intent">
              Pogledaj sve objave
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>

        <QaHomePreview questions={qaPreview} />

        <ImportantDatesHomeSection dates={importantDates} />

        {location ? <DzematLocationSection location={location} siteName={siteName} /> : null}
      </PageMain>
    </>
  );
}

function Featured({ featured }: { featured: PostCardData[] }) {
  const shouldReduceMotion = useReducedMotion();
  const autoplayPlugin = useMemo(
    () => Autoplay({ delay: 8000, stopOnInteraction: true, stopOnMouseEnter: true }),
    [],
  );

  const [only] = featured;
  if (featured.length === 1 && only) {
    return (
      <section aria-label="Istaknuta objava" className="mb-8 sm:mb-10">
        <FeaturedHeroCard post={only} />
      </section>
    );
  }

  return (
    <Carousel
      aria-label="Istaknute objave"
      className="mb-8 w-full sm:mb-10"
      opts={{ loop: true, duration: shouldReduceMotion ? 0 : 32 }}
      plugins={shouldReduceMotion ? [] : [autoplayPlugin]}
    >
      <CarouselContent className="items-stretch">
        {featured.map((post, index) => (
          <CarouselItem
            key={post.slug}
            aria-label={`${index + 1} od ${featured.length}`}
            className="h-auto"
          >
            <div className="h-full">
              <FeaturedHeroCard post={post} />
            </div>
          </CarouselItem>
        ))}
      </CarouselContent>
      <CarouselPrevious />
      <CarouselNext />
    </Carousel>
  );
}
