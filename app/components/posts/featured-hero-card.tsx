import { Link } from "react-router";

import { Star } from "lucide-react";
import { motion } from "motion/react";

import { PostTypeBadge } from "#app/components/posts/post-type-badge";
import { formatDateLong, toIsoDate } from "#app/lib/date";
import type { PostTypeValue } from "#app/lib/post-type";

type FeaturedHeroPost = {
  slug: string;
  title: string;
  excerpt: string;
  type: PostTypeValue;
  publishedAt: Date | string;
};

type FeaturedHeroCardProps = {
  post: FeaturedHeroPost;
  className?: string;
};

export function FeaturedHeroCard({ post, className }: FeaturedHeroCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, ease: "easeOut" }}
      className={["relative h-full overflow-hidden rounded-2xl", className]
        .filter(Boolean)
        .join(" ")}
    >
      <Link
        to={`/objave/${post.slug}`}
        className="focus-visible:ring-ring block h-full rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
      >
        <div className="bg-primary relative flex h-full min-h-85 flex-col px-6 py-10 sm:px-10 sm:py-14">
          <div
            aria-hidden="true"
            className="absolute -top-10 -right-10 h-40 w-40 rounded-full bg-[hsl(var(--secondary)/0.3)] blur-3xl"
          />
          <div
            aria-hidden="true"
            className="absolute -bottom-8 -left-8 h-32 w-32 rounded-full bg-[hsl(var(--emerald-glow)/0.3)] blur-2xl"
          />

          <div className="relative z-10 flex h-full flex-1 flex-col">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3, duration: 0.5 }}
              className="mb-4 flex items-center gap-2"
            >
              <Star className="fill-secondary text-secondary h-5 w-5" aria-hidden="true" />
              <span className="text-secondary text-sm font-semibold tracking-wider uppercase">
                Istaknuto
              </span>
            </motion.div>

            <motion.h2
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.5 }}
              className="font-display text-primary-foreground mb-3 text-2xl font-bold text-balance sm:text-3xl"
            >
              {post.title}
            </motion.h2>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.55, duration: 0.5 }}
              className="text-primary-foreground/80 mb-5 line-clamp-3 max-w-2xl text-base leading-relaxed text-pretty hyphens-auto"
            >
              {post.excerpt}
            </motion.p>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.65, duration: 0.5 }}
              className="mt-auto flex items-center gap-4"
            >
              <PostTypeBadge type={post.type} variant="overlay" />
              <time
                dateTime={toIsoDate(post.publishedAt)}
                className="text-primary-foreground/70 text-sm"
              >
                {formatDateLong(post.publishedAt)}
              </time>
            </motion.div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
