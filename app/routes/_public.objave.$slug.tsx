import { Link, useLocation, useMatches, useNavigate } from "react-router";

import { ArrowLeft, Pencil, Pin } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";

import { PostTypeBadge } from "#app/components/posts/post-type-badge";
import { ShareButton } from "#app/components/posts/share-button";
import { Button } from "#app/components/ui/button";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "#app/components/ui/carousel";
import { formatPageTitle, getSiteNameFromMatches } from "#app/lib/branding";
import { formatDateLong, toIsoDate } from "#app/lib/date";
import { plainExcerpt } from "#app/lib/post-excerpt";
import { POST_TYPE_LABEL } from "#app/lib/post-type";
import { getCurrentUser } from "#app/utils/auth.server.js";
import { prisma } from "#app/utils/db.server";
import { env } from "#app/utils/env.server";

import type { Route } from "./+types/_public.objave.$slug";

export async function loader({ params, request }: Route.LoaderArgs) {
  const isAdminLoggedIn = (await getCurrentUser(request)) !== null;
  const post = await prisma.post.findUnique({
    where: { slug: params.slug },
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
  const siteName = getSiteNameFromMatches(matches);

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

/**
 * Detect whether `body` looks like HTML (from the rich editor) or
 * plain text (legacy posts created before the editor was added).
 * Plain text gets wrapped in `<p>` tags so both render correctly.
 */
function bodyToHtml(body: string): string {
  const trimmed = body.trim();
  if (trimmed.startsWith("<")) {
    // Strip any accidental `<script>` / `<iframe>` / event handlers as
    // a defence-in-depth measure even though admins are trusted.
    return trimmed
      .replaceAll(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
      .replaceAll(/<iframe\b[^>]*>.*?<\/iframe>/gi, "")
      .replaceAll(/\bon\w+\s*=\s*"[^"]*"/gi, "")
      .replaceAll(/\bon\w+\s*=\s*'[^']*'/gi, "");
  }

  // Legacy plain text — split on blank lines → paragraphs.
  return trimmed
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p>${p}</p>`)
    .join("");
}

export default function PostDetailPage({ loaderData }: Route.ComponentProps) {
  const { post, siteUrl, isAdminLoggedIn } = loaderData;
  const matches = useMatches();
  const navigate = useNavigate();
  const location = useLocation();

  const fromList = (location.state as { fromList?: boolean } | null)?.fromList === true;
  const siteName = getSiteNameFromMatches(matches);
  const canonical = `${siteUrl}/objave/${post.slug}`;
  const bodyHtml = bodyToHtml(post.body);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    datePublished: toIsoDate(post.publishedAt),
    dateModified: toIsoDate(post.updatedAt),
    inLanguage: "bs-BA",
    mainEntityOfPage: canonical,
    articleSection: POST_TYPE_LABEL[post.type],
    image: post.images.map((image) => `${siteUrl}/slike/${image.id}`),
    publisher: {
      "@type": "Organization",
      name: siteName,
      url: siteUrl,
    },
  };

  return (
    <AnimatePresence>
      <motion.main
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="mx-auto max-w-3xl px-4 py-3 sm:py-6"
      >
        <script
          type="application/ld+json"
          // Safe: payload is built from trusted DB fields. We escape `</`
          // explicitly to avoid accidental early-close of the script tag.
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(jsonLd).replaceAll("</", String.raw`<\/`),
          }}
        />

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

        <motion.article
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.5 }}
        >
          <h1 className="font-display text-foreground mb-2 text-3xl leading-tight font-bold sm:text-4xl">
            {post.title}
          </h1>

          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <PostTypeBadge type={post.type} />

              {post.pinned && isAdminLoggedIn ? (
                <span className="text-secondary inline-flex items-center gap-1">
                  <Pin className="fill-secondary h-4 w-4" aria-hidden="true" />
                  <span className="text-xs font-semibold tracking-wide uppercase">Na vrhu</span>
                </span>
              ) : null}
              <time
                dateTime={toIsoDate(post.publishedAt)}
                className="text-muted-foreground text-sm"
              >
                {formatDateLong(post.publishedAt)}
              </time>
            </div>
          </div>

          {post.images.length > 0 && <PostImagesCarousel images={post.images} />}

          <div className="bg-border mb-8 h-px" />

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.4 }}
            className="prose prose-stone text-foreground/85 max-w-none leading-relaxed"
            dangerouslySetInnerHTML={{ __html: bodyHtml }}
          />
        </motion.article>
      </motion.main>
    </AnimatePresence>
  );
}

const PostImagesCarousel = ({ images }: { images: ImageData[] }) => {
  if (images.length === 1)
    return (
      <div className="mb-8">
        <SingleImage image={images[0]} />
      </div>
    );

  return (
    <div className="mb-8">
      <Carousel className="w-full">
        <CarouselContent>
          {images.map((image) => (
            <CarouselItem key={image.id}>
              <div className="overflow-hidden rounded-xl">
                <img
                  src={`/slike/${image.id}`}
                  alt={image.altText ?? ""}
                  width={image.width ?? undefined}
                  height={image.height ?? undefined}
                  loading="lazy"
                  decoding="async"
                  className="aspect-video h-full w-full object-cover"
                />
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>

        <CarouselPrevious />
        <CarouselNext />
      </Carousel>
    </div>
  );
};

type ImageData = {
  id: string;
  altText: string | null;
  width: number | null;
  height: number | null;
};

function SingleImage({ image }: { image: ImageData | undefined }) {
  if (!image) return null;

  return (
    <div className="overflow-hidden rounded-xl">
      <img
        src={`/slike/${image.id}`}
        alt={image.altText ?? ""}
        width={image.width ?? undefined}
        height={image.height ?? undefined}
        loading="lazy"
        decoding="async"
        className="aspect-video h-full w-full object-cover"
      />
    </div>
  );
}
