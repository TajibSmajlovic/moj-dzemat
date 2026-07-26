import type { PostTypeValue } from "#app/features/posts/post-type";

const PWA_TEST_POST_COUNT = 22;
const PWA_TEST_BASE_TIME = Date.parse("2026-07-20T12:00:00.000Z");
const POST_TYPES = ["obavijest", "hutba", "sergija", "smrtovnica", "price"] as const;

export type PwaTestPost = {
  id: string;
  slug: string;
  title: string;
  body: string;
  type: PostTypeValue;
  publishedAt: Date;
  createdAt: Date;
};

export const PWA_TEST_POSTS = Array.from({ length: PWA_TEST_POST_COUNT }, (_, index) => {
  const ordinal = String(index + 1).padStart(2, "0");
  const timestamp = new Date(PWA_TEST_BASE_TIME - index * 60_000);

  return {
    id: `pwa-test-post-${ordinal}`,
    slug: `pwa-test-objava-${ordinal}`,
    title: `PWA test objava ${ordinal}`,
    body: `<p>Sačuvani sadržaj PWA test objave ${ordinal}.</p>`,
    type: POST_TYPES[index % POST_TYPES.length],
    publishedAt: timestamp,
    createdAt: timestamp,
  };
}) as [PwaTestPost, ...PwaTestPost[]];
