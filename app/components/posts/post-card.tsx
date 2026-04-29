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
  thumbnailId?: string | null;
};

type PostCardProps = {
  post: PostCardData;
  index?: number;
};

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
        <div className="bg-secondary text-secondary-foreground absolute -top-2 -right-2 z-20 flex items-center gap-1 rounded-full px-2 py-0.5 shadow-md sm:px-2.5 sm:py-1">
          <Pin className="h-3 w-3 fill-current sm:h-3.5 sm:w-3.5" aria-hidden="true" />
          <span className="text-[11px] font-semibold tracking-wide uppercase sm:text-xs">
            Na vrhu
          </span>
        </div>
      )}

      <Link
        to={`/objave/${post.slug}`}
        prefetch="intent"
        state={{ fromList: true }}
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
            <div className="absolute top-2.5 left-2.5 z-10 sm:top-3 sm:left-3">
              <PostTypeBadge
                type={post.type}
                variant="overlay"
                className="px-2.5 py-0.5 text-xs sm:px-3 sm:py-1 sm:text-sm"
              />
            </div>
          </div>
        ) : null}

        <div className="flex flex-1 flex-col p-4 sm:p-5">
          {!thumbnail && (
            <div className="mb-2.5 sm:mb-3">
              <PostTypeBadge
                type={post.type}
                className="px-2.5 py-0.5 text-xs sm:px-3 sm:py-1 sm:text-sm"
              />
            </div>
          )}

          <h3 className="font-display group-hover:text-primary text-foreground mb-1.5 text-base font-semibold text-balance transition-colors sm:mb-2 sm:text-lg">
            {post.title}
          </h3>

          <p
            className={`text-muted-foreground mb-3 text-sm leading-relaxed hyphens-auto sm:mb-4 ${
              thumbnail ? "line-clamp-2" : "line-clamp-4 sm:line-clamp-6"
            }`}
          >
            {post.excerpt}
          </p>

          <div className="mt-auto flex items-center justify-between pt-1.5 sm:pt-2">
            <time
              dateTime={toIsoDate(post.publishedAt)}
              className="text-muted-foreground text-[11px] sm:text-xs"
            >
              {formatDateLong(post.publishedAt)}
            </time>
            <div className="flex items-center gap-2 sm:gap-3">
              <button
                type="button"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  shareOnFacebook(`/objave/${post.slug}`);
                }}
                aria-label="Podijeli na Facebooku"
                className="text-muted-foreground hover:text-primary transition-colors"
              >
                <FacebookIcon className="h-4 w-4" />
              </button>
              <span className="text-primary group-hover:text-primary/80 text-xs font-medium transition-colors sm:hidden">
                Više →
              </span>
              <span className="text-primary group-hover:text-primary/80 hidden text-sm font-medium transition-colors sm:inline">
                Pročitaj više →
              </span>
            </div>
          </div>
        </div>
      </Link>
    </motion.article>
  );
}
