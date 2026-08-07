import { prisma } from "../../../app/server/db.server";
import { createQuestion } from "../../factories";

/**
   Anchor for seeded question timestamps. Fixed for the same reason as
   the post fixture's `BASE_TIME`: stable ordering on every run.
 */
const QUESTION_BASE_TIME = Date.parse("2026-04-22T15:00:00Z");

export type SeededQuestion = {
  key: string;
  question: string;
  answer: string | null;
  isHidden: boolean;
  answeredAt: Date | null;
  createdAt: Date;
};

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

const SEEDED_QA_QUESTIONS = [
  ...SEEDED_QA_VISIBLE,
  SEEDED_QA_HIDDEN,
  ...SEEDED_QA_PENDING,
] as const satisfies readonly SeededQuestion[];

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

/**
   Restores the deterministic Q&A rows (visible, hidden, pending) that
   `qa.spec.ts` and the public listing assert against.

   Restore-safe: rows are matched on their question text and reset to
   their seeded answer and visibility, so a spec that hides or answers a
   seeded question can undo it. Questions a spec created itself are left
   alone, since the specs that add them own their own cleanup.
 */
export async function ensureQA() {
  for (const seeded of SEEDED_QA_QUESTIONS) {
    const existing = await prisma.question.findFirst({
      where: { question: seeded.question },
      select: { id: true },
    });

    if (!existing) {
      await createQuestion({
        question: seeded.question,
        answer: seeded.answer,
        isHidden: seeded.isHidden,
        answeredAt: seeded.answeredAt,
        createdAt: seeded.createdAt,
      });
      continue;
    }

    await prisma.question.update({
      where: { id: existing.id },
      data: {
        answer: seeded.answer,
        isHidden: seeded.isHidden,
        answeredAt: seeded.answeredAt,
        createdAt: seeded.createdAt,
      },
    });
  }
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
    answeredAt: null,
    isHidden: false,
    createdAt,
  };
}

function questionTimestamp(minutesAgo: number): Date {
  return new Date(QUESTION_BASE_TIME - minutesAgo * 60_000);
}
