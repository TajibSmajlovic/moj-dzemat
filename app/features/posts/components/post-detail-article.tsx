import { type RefObject, useRef, useState } from "react";

import { ChevronLeft, ChevronRight, Maximize2, Pin, X } from "lucide-react";
import { motion } from "motion/react";
import { Dialog } from "radix-ui";

import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "#app/components/ui/carousel";
import { PostArticleJsonLd } from "#app/features/posts/components/post-article-json-ld";
import { PostTypeBadge } from "#app/features/posts/components/post-type-badge";
import { YouTubeFacade } from "#app/features/posts/components/youtube-facade";
import { postImageHref } from "#app/features/posts/post-routes";
import type { PostTypeValue } from "#app/features/posts/post-type";
import { youtubeEmbedUrl } from "#app/features/posts/post-video";
import { formatDateLong, toIsoDate } from "#app/lib/date";
import { motionTransitions } from "#app/lib/motion";

type PostDetailImage = {
  id: string;
  altText: string | null;
  width: number | null;
  height: number | null;
};

type PostDetailVideo = {
  id: string;
  providerId: string;
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
  videos: PostDetailVideo[];
};

type PostDetailArticleProps = {
  post: PostDetailPost;
  siteName: string;
  siteUrl?: string;
  showPinnedBadge?: boolean;
  showStructuredData?: boolean;
};

export function PostDetailArticle({
  post,
  siteName,
  siteUrl,
  showPinnedBadge = false,
  showStructuredData = false,
}: PostDetailArticleProps) {
  // `body` is stored already sanitised by `sanitizePostBody` at write
  // time, so the renderer trusts the value as-is.
  const bodyHtml = post.body;
  const media = buildMedia(post);

  return (
    <>
      <PostArticleJsonLd
        enabled={showStructuredData}
        post={post}
        siteName={siteName}
        siteUrl={siteUrl}
      />

      <article>
        <h1 className="font-display text-foreground mt-3 mb-3 text-2xl leading-[1.16] font-bold text-balance sm:mt-2 sm:mb-2 sm:text-4xl sm:leading-tight">
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

        {media.length > 0 ? <PostMediaCarousel media={media} fallbackAlt={post.title} /> : null}

        <div className="bg-border mb-8 h-px" />

        <div
          className="prose prose-stone prose-headings:text-foreground prose-a:text-primary prose-strong:text-foreground prose-blockquote:border-primary/30 prose-blockquote:text-muted-foreground dark:prose-invert dark:prose-a:text-primary text-foreground/85 max-w-none min-w-0 leading-relaxed wrap-break-word"
          dangerouslySetInnerHTML={{ __html: bodyHtml }}
        />
      </article>
    </>
  );
}

type MediaItem =
  | { kind: "image"; key: string; image: PostDetailImage }
  | { kind: "video"; key: string; videoId: string };

function buildMedia(post: PostDetailPost): MediaItem[] {
  return [
    ...post.videos.map((video) => ({
      kind: "video" as const,
      key: video.id,
      videoId: video.providerId,
    })),
    ...post.images.map((image) => ({ kind: "image" as const, key: image.id, image })),
  ];
}

const PostMediaCarousel = ({ media, fallbackAlt }: { media: MediaItem[]; fallbackAlt: string }) => {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const openerRef = useRef<HTMLButtonElement | null>(null);

  const openLightbox = (index: number, opener: HTMLButtonElement) => {
    openerRef.current = opener;
    setLightboxIndex(index);
  };

  const showPrevious = () => {
    setLightboxIndex((current) => {
      if (current === null) return current;

      return current === 0 ? media.length - 1 : current - 1;
    });
  };

  const showNext = () => {
    setLightboxIndex((current) => {
      if (current === null) return current;

      return current === media.length - 1 ? 0 : current + 1;
    });
  };

  const renderItem = (item: MediaItem, index: number) =>
    item.kind === "image" ? (
      <ExpandableImage
        image={item.image}
        index={index}
        fallbackAlt={fallbackAlt}
        onOpen={openLightbox}
        priority={index === 0}
      />
    ) : (
      <YouTubeFacade
        videoId={item.videoId}
        title={fallbackAlt}
        onExpand={(event) => openLightbox(index, event.currentTarget)}
      />
    );

  return (
    <div className="mb-8">
      {media.length === 1 && media[0] ? (
        renderItem(media[0], 0)
      ) : (
        <Carousel className="w-full">
          <CarouselContent>
            {media.map((item, index) => (
              <CarouselItem key={item.key}>{renderItem(item, index)}</CarouselItem>
            ))}
          </CarouselContent>
          <CarouselPrevious />
          <CarouselNext />
        </Carousel>
      )}

      {lightboxIndex === null ? null : (
        <MediaLightbox
          media={media}
          activeIndex={lightboxIndex}
          fallbackAlt={fallbackAlt}
          openerRef={openerRef}
          onClose={() => setLightboxIndex(null)}
          onPrevious={showPrevious}
          onNext={showNext}
        />
      )}
    </div>
  );
};

function ExpandableImage({
  image,
  index,
  fallbackAlt,
  onOpen,
  priority = false,
}: {
  image: PostDetailImage;
  index: number;
  fallbackAlt: string;
  onOpen: (index: number, opener: HTMLButtonElement) => void;
  priority?: boolean;
}) {
  const label = image.altText
    ? `Otvori sliku ${index + 1}: ${image.altText}`
    : `Otvori sliku ${index + 1} preko cijelog ekrana`;

  return (
    <button
      type="button"
      aria-label={label}
      onClick={(event) => onOpen(index, event.currentTarget)}
      className="focus-visible:ring-ring group relative block w-full cursor-zoom-in overflow-hidden rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
    >
      <img
        src={postImageHref(image.id)}
        alt={formatImageAlt(image, index, fallbackAlt)}
        width={image.width ?? undefined}
        height={image.height ?? undefined}
        loading={priority ? "eager" : "lazy"}
        decoding="async"
        fetchPriority={priority ? "high" : undefined}
        className="aspect-video h-full w-full rounded-xl object-cover transition-transform duration-300 ease-out group-hover:scale-[1.015] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
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

function MediaLightbox({
  media,
  activeIndex,
  fallbackAlt,
  openerRef,
  onClose,
  onPrevious,
  onNext,
}: {
  media: MediaItem[];
  activeIndex: number;
  fallbackAlt: string;
  openerRef: RefObject<HTMLButtonElement | null>;
  onClose: VoidFunction;
  onPrevious: VoidFunction;
  onNext: VoidFunction;
}) {
  const item = media[activeIndex];
  const canNavigate = media.length > 1;
  const allImages = media.every((mediaItem) => mediaItem.kind === "image");

  if (!item) return null;

  const activeNoun = item.kind === "video" ? "videa" : "slike";
  const counterKind = item.kind === "video" ? "Video" : "Slika";
  const closeLabel = item.kind === "video" ? "Zatvori prikaz videa" : "Zatvori prikaz slike";

  return (
    <Dialog.Root
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="bg-lightbox/95 fixed inset-0 z-10000 backdrop-blur-md" />
        <Dialog.Content
          asChild
          aria-describedby={undefined}
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            openerRef.current?.focus();
          }}
          onKeyDown={(event) => {
            if (!canNavigate) return;
            if (event.key === "ArrowLeft") {
              event.preventDefault();
              onPrevious();
            } else if (event.key === "ArrowRight") {
              event.preventDefault();
              onNext();
            }
          }}
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={motionTransitions.lightbox}
            className="text-lightbox-foreground fixed inset-0 z-10000 overflow-hidden overscroll-none p-3 sm:p-6"
            onClick={(event) => {
              if (event.target === event.currentTarget) onClose();
            }}
          >
            <Dialog.Title className="sr-only">
              Pregled {activeNoun} preko cijelog ekrana
            </Dialog.Title>
            <div className="absolute inset-x-0 top-0 z-20 flex items-center justify-between gap-3 px-3 py-3 sm:px-6 sm:py-5">
              <div className="border-lightbox-foreground/15 bg-lightbox-foreground/10 text-lightbox-foreground/85 rounded-full border px-3 py-1.5 text-xs font-medium shadow-sm backdrop-blur-md sm:text-sm">
                {counterKind} {activeIndex + 1}
                {canNavigate ? ` od ${media.length}` : null}
              </div>

              <Dialog.Close asChild>
                <button
                  type="button"
                  aria-label={closeLabel}
                  className="border-lightbox-foreground/15 bg-lightbox-foreground/10 text-lightbox-foreground/90 hover:bg-lightbox-foreground/20 focus-visible:ring-ring focus-visible:ring-offset-lightbox inline-flex h-10 w-10 items-center justify-center rounded-full border shadow-sm backdrop-blur-md transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
                >
                  <X className="h-5 w-5" aria-hidden="true" />
                </button>
              </Dialog.Close>
            </div>

            <div className="flex h-full items-center justify-center px-0 pt-14 pb-10 sm:px-12">
              {item.kind === "image" ? (
                <motion.img
                  key={item.image.id}
                  src={postImageHref(item.image.id)}
                  alt={formatImageAlt(item.image, activeIndex, fallbackAlt)}
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={motionTransitions.lightbox}
                  className="ring-lightbox-foreground/10 max-h-full max-w-full rounded-lg object-contain shadow-[0_24px_80px_rgba(0,0,0,0.45)] ring-1"
                />
              ) : (
                <iframe
                  key={item.videoId}
                  src={youtubeEmbedUrl(item.videoId, { autoplay: true })}
                  title={fallbackAlt}
                  className="ring-lightbox-foreground/10 aspect-video max-h-full w-full max-w-4xl rounded-lg shadow-[0_24px_80px_rgba(0,0,0,0.45)] ring-1"
                  allow="autoplay; encrypted-media; picture-in-picture; web-share"
                  allowFullScreen
                />
              )}
            </div>

            {canNavigate ? (
              <>
                <LightboxNavButton
                  label={allImages ? "Prethodna slika" : "Prethodni medij"}
                  direction="previous"
                  onClick={onPrevious}
                />
                <LightboxNavButton
                  label={allImages ? "Sljedeća slika" : "Sljedeći medij"}
                  direction="next"
                  onClick={onNext}
                />
              </>
            ) : null}

            {item.kind === "image" && item.image.altText ? (
              <p className="text-lightbox-foreground/80 absolute inset-x-4 bottom-4 text-center text-sm">
                {item.image.altText}
              </p>
            ) : null}
          </motion.div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function formatImageAlt(image: PostDetailImage, index: number, fallbackAlt: string) {
  const normalizedAlt = image.altText?.trim();
  if (normalizedAlt) return normalizedAlt;

  const normalizedFallback = fallbackAlt.trim();
  return normalizedFallback ? `${normalizedFallback} - slika ${index + 1}` : "";
}

function LightboxNavButton({
  label,
  direction,
  onClick,
}: {
  label: string;
  direction: "previous" | "next";
  onClick: VoidFunction;
}) {
  const Icon = direction === "previous" ? ChevronLeft : ChevronRight;

  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={`border-lightbox-foreground/15 bg-lightbox-foreground/10 text-lightbox-foreground/90 hover:bg-lightbox-foreground/20 focus-visible:ring-ring focus-visible:ring-offset-lightbox absolute top-1/2 inline-flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border shadow-sm backdrop-blur-md transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 sm:h-11 sm:w-11 ${
        direction === "previous" ? "left-3 sm:left-5" : "right-3 sm:right-5"
      }`}
    >
      <Icon className="h-5 w-5" aria-hidden="true" />
    </button>
  );
}
