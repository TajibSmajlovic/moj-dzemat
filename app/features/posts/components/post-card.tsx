import { NavigationType, useNavigationType } from "react-router";

import { Pin } from "lucide-react";
import { motion } from "motion/react";

import { FacebookIcon } from "#app/components/icons/facebook-icon";
import { PostTypeBadge } from "#app/features/posts/components/post-type-badge";
import type { PostCardData } from "#app/features/posts/post-card-data";
import { postHref, postImageHref } from "#app/features/posts/post-routes";
import { cn } from "#app/lib/cn";
import { formatDateLong, toIsoDate } from "#app/lib/date";
import { cardReveal } from "#app/lib/motion";
import { shareOnFacebook } from "#app/lib/share";
import { PublicTransitionLink } from "#app/platform/view-transitions/public-transition-link";
import { useSuppressPublicRouteMotion } from "#app/platform/view-transitions/public-view-transition-provider";

type PostCardProps = {
  post: PostCardData;
  /** Mark as the LCP image candidate — uses eager loading + fetchpriority high */
  priority?: boolean;
};

export function PostCard({ post, priority }: PostCardProps) {
  const thumbnail = post.thumbnailId ? postImageHref(post.thumbnailId) : null;
  const href = postHref(post.slug);
  const navigationType = useNavigationType();
  const suppressRouteMotion = useSuppressPublicRouteMotion();
  const skipEntrance = navigationType === NavigationType.Pop || suppressRouteMotion;

  return (
    <motion.article
      {...(skipEntrance ? {} : cardReveal)}
      className={cn(
        "group border-border bg-card relative flex h-full min-w-0 flex-col overflow-visible rounded-xl border shadow-sm",
        "transition-shadow duration-200 ease-out hover:shadow-md hover:will-change-transform",
        "motion-reduce:transition-none",
        !thumbnail && "min-h-92 sm:min-h-0",
      )}
    >
      {post.pinned && (
        <div className="post-card-transition-decoration bg-secondary text-secondary-foreground pointer-events-none absolute -top-2 -right-2 z-20 flex items-center gap-1 rounded-full px-2 py-0.5 shadow-md transition-opacity duration-100 ease-out motion-reduce:transition-none sm:px-2.5 sm:py-1">
          <Pin className="h-3 w-3 fill-current sm:h-3.5 sm:w-3.5" aria-hidden="true" />
          <span className="text-[11px] font-semibold tracking-wide uppercase sm:text-xs">
            Na vrhu
          </span>
        </div>
      )}

      {thumbnail ? (
        <div className="relative isolate aspect-video w-full overflow-hidden rounded-t-xl">
          <img
            src={thumbnail}
            alt=""
            width={756}
            height={425}
            loading={priority ? "eager" : "lazy"}
            decoding="async"
            fetchPriority={priority ? "high" : undefined}
            className="h-full w-full rounded-t-xl object-cover transition-transform duration-500 ease-out group-hover:will-change-transform motion-reduce:transition-none sm:group-hover:scale-[1.012] motion-reduce:sm:group-hover:scale-100"
          />
          <div className="post-card-transition-decoration pointer-events-none absolute top-2.5 left-2.5 z-20 transition-opacity duration-100 ease-out motion-reduce:transition-none sm:top-3 sm:left-3">
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

        <h3 className="font-display group-hover:text-primary text-foreground mb-1.5 line-clamp-2 text-base font-semibold text-balance wrap-break-word transition-colors sm:mb-2 sm:text-lg">
          <PublicTransitionLink
            to={href}
            prefetch="intent"
            state={{ fromList: true }}
            className="focus-visible:after:ring-ring after:absolute after:inset-0 after:z-10 after:rounded-xl focus:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:after:ring-2 focus-visible:after:ring-offset-2"
          >
            {post.title}
          </PublicTransitionLink>
        </h3>

        <p
          className={`text-muted-foreground mb-3 text-sm leading-relaxed wrap-break-word hyphens-auto sm:mb-4 ${
            thumbnail ? "line-clamp-2" : "line-clamp-9 sm:line-clamp-8"
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
          <div className="flex items-center">
            <button
              type="button"
              onClick={() => shareOnFacebook(href)}
              aria-label="Podijeli na Facebooku"
              className="text-muted-foreground hover:text-primary relative z-20 flex h-11 w-11 items-center justify-center transition-colors"
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
    </motion.article>
  );
}
