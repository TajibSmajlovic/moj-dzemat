import type { PostTypeValue } from "../../../app/features/posts/post-type";

export const ADMIN_EMAIL = "admin@dzemat.ba";
export const ADMIN_PASSWORD = "#tajnaLozinkaZaE2ETestove2024";
export const BASE_TIME = Date.parse("2026-04-22T12:00:00Z");

const SEEDED_POST_COUNT = 35;
const POST_TYPE_SEQUENCE = [
  "obavijest",
  "hutba",
  "sergija",
  "smrtovnica",
  "price",
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
