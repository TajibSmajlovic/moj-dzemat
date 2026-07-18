import type { Prisma } from "#generated/prisma/client";

import { ADMIN_POSTS_PAGE_SIZE, getPaginationState } from "#app/lib/pagination";
import { prisma } from "#app/server/db.server";

const adminPostListOrderBy: Prisma.PostOrderByWithRelationInput[] = [
  { pinned: "desc" },
  { publishedAt: "desc" },
  { createdAt: "desc" },
  { id: "desc" },
];

const adminPostListSelect = {
  id: true,
  slug: true,
  title: true,
  type: true,
  status: true,
  publishedAt: true,
  featured: true,
  pinned: true,
  images: {
    orderBy: { position: "asc" },
    select: { id: true },
  },
} satisfies Prisma.PostSelect;

type AdminPostListItem = Prisma.PostGetPayload<{ select: typeof adminPostListSelect }>;

export async function getAdminPostListPage({ page }: { page: number }) {
  const totalPosts = await prisma.post.count();
  const pagination = getPaginationState({
    page,
    pageSize: ADMIN_POSTS_PAGE_SIZE,
    totalItems: totalPosts,
  });

  if (pagination.totalPages > 0 && page > pagination.totalPages) {
    return { posts: [] as AdminPostListItem[], pagination };
  }

  const posts = await prisma.post.findMany({
    orderBy: adminPostListOrderBy,
    skip: pagination.skip,
    take: pagination.pageSize,
    select: adminPostListSelect,
  });

  return { posts, pagination };
}
