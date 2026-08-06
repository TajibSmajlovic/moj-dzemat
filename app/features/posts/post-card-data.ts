import type { PostTypeValue } from "#app/features/posts/post-type";
import type { PostTransitionMediaKind } from "#app/features/view-transitions/view-transition-model";

export type PostCardData = {
  slug: string;
  title: string;
  excerpt: string;
  type: PostTypeValue;
  publishedAt: Date | string;
  pinned?: boolean;
  thumbnailId?: string | null;
  firstMediaKind: PostTransitionMediaKind | null;
};
