import { Pin } from "lucide-react";
import { motion } from "motion/react";

import { PostTypeBadge } from "#app/components/posts/post-type-badge";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "#app/components/ui/carousel";
import { formatDateLong, toIsoDate } from "#app/lib/date";
import { POST_TYPE_LABEL, type PostTypeValue } from "#app/lib/post-type";

export type PostDetailImage = {
  id: string;
  altText: string | null;
  width: number | null;
  height: number | null;
};

export type PostDetailPost = {
  slug: string;
  title: string;
  body: string;
  type: PostTypeValue;
  publishedAt: Date | string;
  updatedAt: Date | string;
  pinned: boolean;
  images: PostDetailImage[];
};

type PostDetailArticleProps = {
  post: PostDetailPost;
  siteName: string;
  siteUrl?: string;
  showPinnedBadge?: boolean;
  showStructuredData?: boolean;
};

/**
 * Detect whether `body` looks like HTML (from the rich editor) or
 * plain text (legacy posts created before the editor was added).
 * Plain text gets wrapped in `<p>` tags so both render correctly.
 */
export function bodyToHtml(body: string): string {
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

  // Legacy plain text - split on blank lines into paragraphs.
  return trimmed
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p>${p}</p>`)
    .join("");
}

export function PostDetailArticle({
  post,
  siteName,
  siteUrl,
  showPinnedBadge = false,
  showStructuredData = false,
}: PostDetailArticleProps) {
  const bodyHtml = bodyToHtml(post.body);
  const canonical = siteUrl ? `${siteUrl}/objave/${post.slug}` : null;
  const jsonLd =
    showStructuredData && canonical
      ? {
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
        }
      : null;

  return (
    <>
      {jsonLd ? (
        <script
          type="application/ld+json"
          // Safe: payload is built from trusted DB fields. We escape `</`
          // explicitly to avoid accidental early-close of the script tag.
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(jsonLd).replaceAll("</", String.raw`<\/`),
          }}
        />
      ) : null}

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

            {post.pinned && showPinnedBadge ? (
              <span className="text-secondary inline-flex items-center gap-1">
                <Pin className="fill-secondary h-4 w-4" aria-hidden="true" />
                <span className="text-xs font-semibold tracking-wide uppercase">Na vrhu</span>
              </span>
            ) : null}

            <time dateTime={toIsoDate(post.publishedAt)} className="text-muted-foreground text-sm">
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
    </>
  );
}

const PostImagesCarousel = ({ images }: { images: PostDetailImage[] }) => {
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

function SingleImage({ image }: { image: PostDetailImage | undefined }) {
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
