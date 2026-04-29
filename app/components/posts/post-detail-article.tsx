import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

import { ChevronLeft, ChevronRight, Maximize2, Pin, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";

import { PostTypeBadge } from "#app/components/posts/post-type-badge";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "#app/components/ui/carousel";
import { formatDateLong, toIsoDate } from "#app/lib/date";
import { normalizeNonBreakingSpaces } from "#app/lib/post-excerpt";
import { POST_TYPE_LABEL, type PostTypeValue } from "#app/lib/post-type";

type PostDetailImage = {
  id: string;
  altText: string | null;
  width: number | null;
  height: number | null;
};

type PostDetailPost = {
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
function bodyToHtml(body: string): string {
  const trimmed = body.trim();
  if (trimmed.startsWith("<")) {
    // Strip any accidental `<script>` / `<iframe>` / event handlers as
    // a defence-in-depth measure even though admins are trusted.
    return normalizeNonBreakingSpaces(
      trimmed
        .replaceAll(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
        .replaceAll(/<iframe\b[^>]*>.*?<\/iframe>/gi, "")
        .replaceAll(/\bon\w+\s*=\s*"[^"]*"/gi, "")
        .replaceAll(/\bon\w+\s*=\s*'[^']*'/gi, ""),
    );
  }

  // Legacy plain text - split on blank lines into paragraphs.
  return normalizeNonBreakingSpaces(trimmed)
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
          className="prose prose-stone text-foreground/85 max-w-none min-w-0 leading-relaxed wrap-break-word"
          dangerouslySetInnerHTML={{ __html: bodyHtml }}
        />
      </motion.article>
    </>
  );
}

const PostImagesCarousel = ({ images }: { images: PostDetailImage[] }) => {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const showPrevious = () => {
    setLightboxIndex((current) => {
      if (current === null) return current;
      return current === 0 ? images.length - 1 : current - 1;
    });
  };

  const showNext = () => {
    setLightboxIndex((current) => {
      if (current === null) return current;
      return current === images.length - 1 ? 0 : current + 1;
    });
  };

  if (images.length === 1)
    return (
      <div className="mb-8">
        <SingleImage image={images[0]} onOpen={setLightboxIndex} />
        <AnimatePresence>
          {lightboxIndex === null ? null : (
            <ImageLightbox
              images={images}
              activeIndex={lightboxIndex}
              onClose={() => setLightboxIndex(null)}
              onPrevious={showPrevious}
              onNext={showNext}
            />
          )}
        </AnimatePresence>
      </div>
    );

  return (
    <div className="mb-8">
      <Carousel className="w-full">
        <CarouselContent>
          {images.map((image, index) => (
            <CarouselItem key={image.id}>
              <ExpandableImage image={image} index={index} onOpen={setLightboxIndex} />
            </CarouselItem>
          ))}
        </CarouselContent>

        <CarouselPrevious />
        <CarouselNext />
      </Carousel>
      <AnimatePresence>
        {lightboxIndex === null ? null : (
          <ImageLightbox
            images={images}
            activeIndex={lightboxIndex}
            onClose={() => setLightboxIndex(null)}
            onPrevious={showPrevious}
            onNext={showNext}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

function SingleImage({
  image,
  onOpen,
}: {
  image: PostDetailImage | undefined;
  onOpen: (index: number) => void;
}) {
  if (!image) return null;

  return <ExpandableImage image={image} index={0} onOpen={onOpen} />;
}

function ExpandableImage({
  image,
  index,
  onOpen,
}: {
  image: PostDetailImage;
  index: number;
  onOpen: (index: number) => void;
}) {
  const label = image.altText
    ? `Otvori sliku ${index + 1}: ${image.altText}`
    : `Otvori sliku ${index + 1} preko cijelog ekrana`;

  return (
    <button
      type="button"
      aria-label={label}
      onClick={() => onOpen(index)}
      className="focus-visible:ring-ring group relative block w-full cursor-zoom-in overflow-hidden rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
    >
      <img
        src={`/slike/${image.id}`}
        alt={image.altText ?? ""}
        width={image.width ?? undefined}
        height={image.height ?? undefined}
        loading="lazy"
        decoding="async"
        className="aspect-video h-full w-full object-cover transition-transform duration-300 ease-out group-hover:scale-[1.02]"
      />
      <span
        aria-hidden="true"
        className="bg-background/90 text-foreground ring-border/60 absolute top-3 right-3 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium opacity-0 shadow-sm ring-1 backdrop-blur-sm transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
      >
        <Maximize2 className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Otvori sliku</span>
      </span>
    </button>
  );
}

function ImageLightbox({
  images,
  activeIndex,
  onClose,
  onPrevious,
  onNext,
}: {
  images: PostDetailImage[];
  activeIndex: number;
  onClose: () => void;
  onPrevious: () => void;
  onNext: () => void;
}) {
  const image = images[activeIndex];
  const canNavigate = images.length > 1;

  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      } else if (event.key === "ArrowLeft" && canNavigate) {
        onPrevious();
      } else if (event.key === "ArrowRight" && canNavigate) {
        onNext();
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [canNavigate, onClose, onNext, onPrevious]);

  if (!image || typeof document === "undefined") return null;

  return createPortal(
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-label="Pregled slike preko cijelog ekrana"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
      className="text-primary-foreground fixed inset-0 z-10000 bg-[hsl(var(--foreground)/0.92)] p-3 backdrop-blur-md sm:p-6"
      onClick={onClose}
    >
      <div className="absolute inset-x-0 top-0 z-20 flex items-center justify-between gap-3 px-3 py-3 sm:px-6 sm:py-5">
        <div className="border-primary-foreground/10 bg-background/10 text-primary-foreground/85 rounded-full border px-3 py-1.5 text-xs font-medium shadow-sm backdrop-blur-md sm:text-sm">
          Slika {activeIndex + 1}
          {canNavigate ? ` od ${images.length}` : null}
        </div>

        <button
          type="button"
          aria-label="Zatvori prikaz slike"
          onClick={onClose}
          className="border-primary-foreground/10 bg-background/10 hover:bg-background/20 focus-visible:ring-ring text-primary-foreground/90 focus-visible:ring-offset-foreground inline-flex h-10 w-10 items-center justify-center rounded-full border shadow-sm backdrop-blur-md transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
        >
          <X className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>

      {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions -- stopPropagation prevents backdrop-close when clicking the image area */}
      <div
        className="flex h-full items-center justify-center px-0 pt-14 pb-10 sm:px-12"
        onClick={(event) => event.stopPropagation()}
      >
        <motion.img
          key={image.id}
          src={`/slike/${image.id}`}
          alt={image.altText ?? ""}
          initial={{ opacity: 0.6, scale: 0.985 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.2 }}
          className="ring-primary-foreground/10 max-h-full max-w-full rounded-lg object-contain shadow-[0_24px_80px_rgba(0,0,0,0.35)] ring-1"
        />
      </div>

      {canNavigate ? (
        <>
          <LightboxNavButton label="Prethodna slika" direction="previous" onClick={onPrevious} />
          <LightboxNavButton label="Sljedeća slika" direction="next" onClick={onNext} />
        </>
      ) : null}

      {image.altText ? (
        <p className="text-primary-foreground/80 absolute inset-x-4 bottom-4 text-center text-sm">
          {image.altText}
        </p>
      ) : null}
    </motion.div>,
    document.body,
  );
}

function LightboxNavButton({
  label,
  direction,
  onClick,
}: {
  label: string;
  direction: "previous" | "next";
  onClick: () => void;
}) {
  const Icon = direction === "previous" ? ChevronLeft : ChevronRight;

  return (
    <button
      type="button"
      aria-label={label}
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
      className={`border-primary-foreground/10 bg-background/10 hover:bg-background/20 focus-visible:ring-ring text-primary-foreground/90 focus-visible:ring-offset-foreground absolute top-1/2 inline-flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border shadow-sm backdrop-blur-md transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 sm:h-11 sm:w-11 ${
        direction === "previous" ? "left-3 sm:left-5" : "right-3 sm:right-5"
      }`}
    >
      <Icon className="h-5 w-5" aria-hidden="true" />
    </button>
  );
}
