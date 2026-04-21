import { Link } from "react-router";

import { Pin } from "lucide-react";
import { motion } from "motion/react";

import { FacebookIcon } from "#app/components/icons/facebook-icon";
import { PostTypeBadge } from "#app/components/posts/post-type-badge";
import { formatDateLong, toIsoDate } from "#app/lib/date";
import type { PostTypeValue } from "#app/lib/post-type";
import { shareOnFacebook } from "#app/lib/share";

export type PostCardData = {
  slug: string;
  title: string;
  excerpt: string;
  type: PostTypeValue;
  publishedAt: Date | string;
  pinned?: boolean;
  /** Image ID served from `/slike/:id`. Optional — cards without an
   *  image fall back to a type-badge header row. */
  thumbnailId?: string | null;
};

type PostCardProps = {
  post: PostCardData;
  index?: number;
};

/**
 * Grid card for the public feed. Uses `<Link>` (not `<a>`) so RR can
 * short-circuit the navigation with a client-side transition. The
 * Facebook share button lives inside the card but stops propagation so
 * clicking it doesn't also trigger the outer navigation.
 */
export function PostCard({ post, index = 0 }: PostCardProps) {
  const thumbnail = post.thumbnailId ? `/slike/${post.thumbnailId}` : null;

  return (
    <motion.article
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.08, ease: "easeOut" }}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      className="group border-border bg-card relative flex h-full flex-col overflow-visible rounded-xl border shadow-sm transition-shadow hover:shadow-md"
    >
      {post.pinned && (
        <div className="bg-secondary text-secondary-foreground absolute -top-2 -right-2 z-20 flex items-center gap-1 rounded-full px-2.5 py-1 shadow-md">
          <Pin className="h-3.5 w-3.5 fill-current" aria-hidden="true" />
          <span className="text-xs font-semibold tracking-wide uppercase">Na vrhu</span>
        </div>
      )}

      <Link
        to={`/objave/${post.slug}`}
        className="focus-visible:ring-ring flex h-full flex-col rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
      >
        {thumbnail ? (
          <div className="relative isolate aspect-video w-full overflow-hidden rounded-t-xl">
            <img
              src={thumbnail}
              alt=""
              loading="lazy"
              decoding="async"
              className="h-full w-full rounded-t-xl object-cover transition-transform duration-300 ease-out will-change-transform group-hover:scale-105"
            />
            <div className="absolute top-3 left-3 z-10">
              <PostTypeBadge type={post.type} variant="overlay" />
            </div>
          </div>
        ) : null}

        <div className="flex flex-1 flex-col p-5">
          {!thumbnail && (
            <div className="mb-3">
              <PostTypeBadge type={post.type} />
            </div>
          )}

          <h3 className="font-display group-hover:text-primary text-foreground mb-2 text-lg font-semibold text-balance transition-colors">
            {post.title}
          </h3>

          <p
            className={`text-muted-foreground mb-4 text-sm leading-relaxed hyphens-auto ${
              thumbnail ? "line-clamp-2" : "line-clamp-6"
            }`}
          >
            {post.excerpt}
          </p>

          <div className="mt-auto flex items-center justify-between pt-2">
            <time dateTime={toIsoDate(post.publishedAt)} className="text-muted-foreground text-xs">
              {formatDateLong(post.publishedAt)}
            </time>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  shareOnFacebook(post.title, `/objave/${post.slug}`);
                }}
                aria-label="Podijeli na Facebooku"
                className="text-muted-foreground hover:text-primary transition-colors"
              >
                <FacebookIcon className="h-4 w-4" />
              </button>
              <span className="text-primary group-hover:text-primary/80 text-sm font-medium transition-colors">
                Pročitaj više →
              </span>
            </div>
          </div>
        </div>
      </Link>
    </motion.article>
  );
}
