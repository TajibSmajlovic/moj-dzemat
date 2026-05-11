import type { Prisma } from "@prisma/client";

import type { PostCardData } from "#app/components/posts/post-card";
import { plainExcerpt } from "#app/lib/post-excerpt";
import { isPostType, type PostTypeValue } from "#app/lib/post-type";
import { prisma } from "#app/utils/db.server";

export const HOME_POST_LIMIT = 20;
const FEATURED_POST_LIMIT = 5;

const publicPostCardSelect = {
  slug: true,
  title: true,
  body: true,
  type: true,
  publishedAt: true,
  pinned: true,
  featured: true,
  images: { orderBy: { position: "asc" }, take: 1, select: { id: true } },
} satisfies Prisma.PostSelect;

const publicPostOrderBy: Prisma.PostOrderByWithRelationInput[] = [
  { pinned: "desc" },
  { publishedAt: "desc" },
  { createdAt: "desc" },
  { id: "desc" },
];

type PublicPostCardRecord = Prisma.PostGetPayload<{ select: typeof publicPostCardSelect }>;

export function getActivePostType(request: Request): PostTypeValue | "all" {
  const url = new URL(request.url);
  const rawType = url.searchParams.get("vrsta");

  return isPostType(rawType) ? rawType : "all";
}

export async function getFeaturedPostCards() {
  const posts = await prisma.post.findMany({
    where: { featured: true, status: "published" },
    orderBy: publicPostOrderBy,
    take: FEATURED_POST_LIMIT,
    select: publicPostCardSelect,
  });

  return posts.map((post) => toPublicPostCard(post));
}

function getPublicPostsWhere(activeType: PostTypeValue | "all"): Prisma.PostWhereInput {
  return activeType === "all" ? { status: "published" } : { status: "published", type: activeType };
}

export async function countPublicPosts({ activeType }: { activeType: PostTypeValue | "all" }) {
  return prisma.post.count({ where: getPublicPostsWhere(activeType) });
}

export async function getPublicPostCards({
  activeType,
  take,
}: {
  activeType: PostTypeValue | "all";
  take?: number;
}) {
  const posts = await prisma.post.findMany({
    where: getPublicPostsWhere(activeType),
    orderBy: publicPostOrderBy,
    ...(take === undefined ? {} : { take }),
    select: publicPostCardSelect,
  });

  return posts.map((post) => toPublicPostCard(post));
}

function toPublicPostCard(post: PublicPostCardRecord): PostCardData {
  return {
    slug: post.slug,
    title: post.title,
    excerpt: plainExcerpt(post.body),
    type: post.type,
    publishedAt: post.publishedAt,
    pinned: post.pinned,
    thumbnailId: post.images[0]?.id ?? null,
  };
}
