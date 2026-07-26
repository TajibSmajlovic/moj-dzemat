import type { PostTypeValue } from "../../../app/features/posts/post-type";

export const ADMIN_EMAIL = "admin@dzemat.ba";
export const ADMIN_PASSWORD = "#tajnaLozinkaZaE2ETestove2024";
export const BASE_TIME = Date.parse("2026-04-22T12:00:00Z");
const QUESTION_BASE_TIME = Date.parse("2026-04-22T15:00:00Z");

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

export type SeededQuestion = {
  key: string;
  question: string;
  answer: string | null;
  isHidden: boolean;
  answeredAt: Date | null;
  createdAt: Date;
};

export const SEEDED_POSTS = Array.from({ length: SEEDED_POST_COUNT }, (_, index) => ({
  index,
  title: `E2E objava ${String(index + 1).padStart(2, "0")}`,
  slug: `e2e-objava-${index + 1}`,
  type: POST_TYPE_SEQUENCE[index % POST_TYPE_SEQUENCE.length],
})) as [SeededPost, ...SeededPost[]];

export const POSTS_TITLES = SEEDED_POSTS.map((post) => post.title) as [string, ...string[]];

export const SEEDED_QA_VISIBLE = [
  seedQuestionAnswered({
    key: "newest",
    question: "Kada mogu postaviti pitanje imamu?",
    answer: "Pitanje možete poslati bilo kada putem forme na stranici Pitanja i odgovori.",
    minutesAgo: 0,
  }),
  seedQuestionAnswered({
    key: "middle",
    question: "Da li se pitanja objavljuju odmah?",
    answer: "Pitanja se prvo pregledaju, a zatim se javno prikazuje odgovor kada bude spreman.",
    minutesAgo: 10,
  }),
  seedQuestionAnswered({
    key: "oldest",
    question: "Mogu li poslati pitanje bez imena?",
    answer: "Da. Forma prima samo tekst pitanja i ne traži ime, email ili druge podatke.",
    minutesAgo: 20,
  }),
] as const satisfies readonly [SeededQuestion, SeededQuestion, SeededQuestion];

const SEEDED_QA_HIDDEN = seedQuestionHidden({
  key: "hidden",
  question: "Sakriveno E2E pitanje?",
  answer: "Ovaj odgovor je sakriven i ne smije se prikazati javno.",
  minutesAgo: 30,
});

const SEEDED_QA_PENDING = [
  seedQuestionPending({
    key: "pending-1",
    question: "E2E pitanje koje čeka prvi odgovor?",
    minutesAgo: 40,
  }),
  seedQuestionPending({
    key: "pending-2",
    question: "E2E drugo pitanje na čekanju?",
    minutesAgo: 50,
  }),
] as const satisfies readonly [SeededQuestion, SeededQuestion];

export const SEEDED_QA_QUESTIONS = [
  ...SEEDED_QA_VISIBLE,
  SEEDED_QA_HIDDEN,
  ...SEEDED_QA_PENDING,
] as const satisfies readonly SeededQuestion[];

export type SeededImportantDate = {
  key: string;
  title: string;
  date: string; // "YYYY-MM-DD"
  description: string | null;
};

/** today + offsetDays as a "YYYY-MM-DD" string (UTC calendar math). */
const pad = (n: number) => String(n).padStart(2, "0");
function ymdFromToday(offsetDays: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + offsetDays);

  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

// "Upcoming" depends on the run date, so generate dates relative to now:
// one future (shows on the home page) and one past (admin only).
export const SEEDED_IMPORTANT_DATES = [
  {
    key: "future",
    title: "E2E važan nadolazeći datum",
    date: ymdFromToday(30),
    description: "Nadolazeći E2E datum koji se prikazuje na početnoj stranici.",
  },
  {
    key: "past",
    title: "E2E prošli važan datum",
    date: ymdFromToday(-30),
    description: "Prošli E2E datum koji se prikazuje samo u admin panelu.",
  },
] as const satisfies readonly [SeededImportantDate, SeededImportantDate];

export const QA_PAGINATION_EXTRA_COUNT = 22;
export const QA_PAGINATION_EXTRA_PREFIX = "E2E dodatno pitanje za paginaciju";

export function seedQuestionPaginationExtra(index: number): SeededQuestion {
  return seedQuestionAnswered({
    key: `pagination-${index + 1}`,
    question: `${QA_PAGINATION_EXTRA_PREFIX} ${String(index + 1).padStart(2, "0")}?`,
    answer: `Dodatni E2E odgovor za paginaciju ${index + 1}.`,
    minutesAgo: 100 + index,
  });
}

function seedQuestionAnswered({
  key,
  question,
  answer,
  minutesAgo,
}: {
  key: string;
  question: string;
  answer: string;
  minutesAgo: number;
}): SeededQuestion {
  const answeredAt = questionTimestamp(minutesAgo);

  return {
    key,
    question,
    answer,
    isHidden: false,
    answeredAt,
    createdAt: new Date(answeredAt.getTime() - 60 * 60_000),
  };
}

function seedQuestionHidden({
  key,
  question,
  answer,
  minutesAgo,
}: {
  key: string;
  question: string;
  answer: string;
  minutesAgo: number;
}): SeededQuestion {
  return {
    ...seedQuestionAnswered({ key, question, answer, minutesAgo }),
    isHidden: true,
  };
}

function seedQuestionPending({
  key,
  question,
  minutesAgo,
}: {
  key: string;
  question: string;
  minutesAgo: number;
}): SeededQuestion {
  const createdAt = questionTimestamp(minutesAgo);

  return {
    key,
    question,
    answer: null,
    isHidden: false,
    answeredAt: null,
    createdAt,
  };
}

function questionTimestamp(minutesAgo: number): Date {
  return new Date(QUESTION_BASE_TIME - minutesAgo * 60_000);
}
