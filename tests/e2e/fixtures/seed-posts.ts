import type { PostTypeValue } from "../../../app/features/posts/post-type";
import { prisma } from "../../../app/server/db.server";
import { createPost } from "../../factories";
import { ADMIN_EMAIL } from "./seed-admin";

/**
   Anchor for every seeded post timestamp. Fixed rather than relative to
   "now" so ordering, pagination, and archive assertions are identical on
   every run.
 */
const BASE_TIME = Date.parse("2026-04-22T12:00:00Z");

/**
   35 posts fills two admin pages (20 per page) with 15 on the second,
   which is what the pagination and delete specs exercise.
 */
const SEEDED_POST_COUNT = 35;

const POST_TYPE_SEQUENCE = [
  "obavijest",
  "hutba",
  "sergija",
  "price",
  "smrtovnica",
] as const satisfies readonly PostTypeValue[];

type SeededPost = {
  index: number;
  slug: string;
  title: string;
  type: PostTypeValue;
};

export const SEEDED_POSTS = Array.from({ length: SEEDED_POST_COUNT }, (_, index) => ({
  index,
  title: `E2E objava ${String(index + 1).padStart(2, "0")}`,
  slug: `e2e-objava-${index + 1}`,
  type: POST_TYPE_SEQUENCE[index % POST_TYPE_SEQUENCE.length],
})) as [SeededPost, ...SeededPost[]];

export const POSTS_TITLES = SEEDED_POSTS.map((post) => post.title) as [string, ...string[]];

/**
   Creates every seeded post that is currently missing, with the same
   deterministic timestamps and body the initial seed uses.

   This is the single definition of "what the seeded post fixture looks
   like": `global-setup.ts` builds the fixture with it, and specs that
   delete seeded rows call it to put them back. Restore-safe, because it
   is keyed on slug and posts are read straight from the database. A
   caller does not need to track which rows it removed, and running it
   when nothing is missing costs one query.
 */
export async function ensurePosts() {
  const missing = await missingSeededPosts();
  if (missing.length === 0) return;

  const admin = await prisma.user.findUniqueOrThrow({
    where: { email: ADMIN_EMAIL },
    select: { id: true },
  });

  for (const post of missing) {
    // Seeded posts are ordered newest first, one minute apart, so list
    // ordering and pagination assertions stay stable across runs.
    const timestamp = new Date(BASE_TIME - post.index * 60_000);

    await createPost({
      authorId: admin.id,
      title: post.title,
      slug: post.slug,
      body: `${post.title} je testna objava tipa ${post.type}.\n\nDrugi paragraf.`,
      type: post.type,
      publishedAt: timestamp,
      createdAt: timestamp,
    });
  }
}

async function missingSeededPosts() {
  const existing = await prisma.post.findMany({
    where: { slug: { in: SEEDED_POSTS.map((post) => post.slug) } },
    select: { slug: true },
  });
  const existingSlugs = new Set(existing.map((post) => post.slug));

  return SEEDED_POSTS.filter((post) => !existingSlugs.has(post.slug));
}
