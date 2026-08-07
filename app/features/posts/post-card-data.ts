import type { PostTypeValue } from "#app/features/posts/post-type";

export type PostCardData = {
  slug: string;
  title: string;
  excerpt: string;
  type: PostTypeValue;
  publishedAt: Date | string;
  pinned?: boolean;
  thumbnailId?: string | null;
};
