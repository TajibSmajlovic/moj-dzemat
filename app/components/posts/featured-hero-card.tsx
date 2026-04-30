import { Link } from "react-router";

import { Star } from "lucide-react";
import { motion } from "motion/react";

import type { PostCardData } from "#app/components/posts/post-card";
import { PostTypeBadge } from "#app/components/posts/post-type-badge";
import { formatDateLong, toIsoDate } from "#app/lib/date";
import { heroContentReveal } from "#app/lib/motion";

type FeaturedHeroCardPost = Pick<
  PostCardData,
  "slug" | "title" | "excerpt" | "type" | "publishedAt"
>;

type FeaturedHeroCardProps = {
  className?: string;
  post: FeaturedHeroCardPost;
};

export function FeaturedHeroCard({ post, className }: FeaturedHeroCardProps) {
  return (
    <div
      className={["relative h-full overflow-hidden rounded-2xl", className]
        .filter(Boolean)
        .join(" ")}
    >
      <Link
        to={`/objave/${post.slug}`}
        state={{ fromList: true }}
        className="focus-visible:ring-ring block h-full rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
      >
        <div className="bg-primary relative flex h-full min-h-76 flex-col px-5 py-7 sm:min-h-85 sm:px-10 sm:py-14">
          <div
            aria-hidden="true"
            className="absolute -top-10 -right-10 h-32 w-32 rounded-full bg-[hsl(var(--secondary)/0.3)] blur-3xl sm:h-40 sm:w-40"
          />
          <div
            aria-hidden="true"
            className="absolute -bottom-8 -left-8 h-24 w-24 rounded-full bg-[hsl(var(--emerald-glow)/0.3)] blur-2xl sm:h-32 sm:w-32"
          />

          <motion.div {...heroContentReveal} className="relative z-10 flex h-full flex-1 flex-col">
            <div className="mb-3 flex items-center gap-2 sm:mb-4">
              <Star
                className="fill-secondary text-secondary h-4 w-4 sm:h-5 sm:w-5"
                aria-hidden="true"
              />
              <span className="text-secondary text-xs font-semibold tracking-wider uppercase sm:text-sm">
                Istaknuto
              </span>
            </div>

            <h2 className="font-display text-primary-foreground mb-2.5 text-[1.7rem] leading-tight font-bold text-balance sm:mb-3 sm:text-3xl">
              {post.title}
            </h2>

            <p className="text-primary-foreground/80 mb-4 line-clamp-4 max-w-2xl text-sm leading-relaxed text-pretty hyphens-auto sm:mb-5 sm:line-clamp-6 sm:text-base">
              {post.excerpt}
            </p>

            <div className="mt-auto flex flex-wrap items-center gap-2.5 sm:gap-4">
              <PostTypeBadge
                type={post.type}
                variant="overlay"
                className="px-2.5 py-0.5 text-xs sm:px-3 sm:py-1 sm:text-sm"
              />
              <time
                dateTime={toIsoDate(post.publishedAt)}
                className="text-primary-foreground/70 text-xs sm:text-sm"
              >
                {formatDateLong(post.publishedAt)}
              </time>
            </div>
          </motion.div>
        </div>
      </Link>
    </div>
  );
}
