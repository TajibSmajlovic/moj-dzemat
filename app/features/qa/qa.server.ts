import type { Prisma } from "#generated/prisma/client";

import { invariant } from "#app/lib/invariant";
import { prisma } from "#app/server/db.server";

export const QA_PAGE_SIZE = 10;
export const QA_HOME_PREVIEW_LIMIT = 5;
export const QA_RELATED_LIMIT = 5;

export type PublicQuestion = {
  id: string;
  question: string;
  answer: string;
  answeredAt: Date;
};

export type AdminQuestionTab = "neodgovorena" | "odgovorena";

export type AdminQuestionRow = {
  id: string;
  question: string;
  answer: string | null;
  isHidden: boolean;
  createdAt: Date;
  answeredAt: Date | null;
};

const publicQuestionSelect = {
  id: true,
  question: true,
  answer: true,
  answeredAt: true,
} satisfies Prisma.QuestionSelect;

const publicQuestionSitemapSelect = {
  id: true,
  answeredAt: true,
} satisfies Prisma.QuestionSelect;

const adminQuestionSelect = {
  id: true,
  question: true,
  answer: true,
  isHidden: true,
  createdAt: true,
  answeredAt: true,
} satisfies Prisma.QuestionSelect;

const publicAnsweredWhere = {
  answer: { not: null },
  isHidden: false,
} satisfies Prisma.QuestionWhereInput;

const publicQuestionOrderBy = [
  { answeredAt: "desc" },
  { id: "desc" },
] satisfies Prisma.QuestionOrderByWithRelationInput[];

type PublicQuestionRecord = Prisma.QuestionGetPayload<{ select: typeof publicQuestionSelect }>;
type PublicQuestionSitemapRecord = Prisma.QuestionGetPayload<{
  select: typeof publicQuestionSitemapSelect;
}>;

export async function countPublicAnsweredQuestions(): Promise<number> {
  return prisma.question.count({ where: publicAnsweredWhere });
}

export async function getPublicAnsweredQuestions({
  take,
  skip,
}: {
  take?: number;
  skip?: number;
} = {}): Promise<PublicQuestion[]> {
  const questions = await prisma.question.findMany({
    where: publicAnsweredWhere,
    orderBy: publicQuestionOrderBy,
    ...(take === undefined ? {} : { take }),
    ...(skip === undefined ? {} : { skip }),
    select: publicQuestionSelect,
  });

  return questions.map((question) => toPublicQuestion(question));
}

export async function getPublicQuestionById(id: string): Promise<PublicQuestion | null> {
  const question = await prisma.question.findFirst({
    where: { id, ...publicAnsweredWhere },
    select: publicQuestionSelect,
  });

  return question ? toPublicQuestion(question) : null;
}

export async function getRelatedPublicQuestions({
  excludeId,
  take = QA_RELATED_LIMIT,
}: {
  excludeId: string;
  take?: number;
}): Promise<PublicQuestion[]> {
  const questions = await prisma.question.findMany({
    where: { ...publicAnsweredWhere, id: { not: excludeId } },
    orderBy: publicQuestionOrderBy,
    take,
    select: publicQuestionSelect,
  });

  return questions.map((question) => toPublicQuestion(question));
}

export async function getPublicAnsweredQuestionSitemap({ take }: { take: number }): Promise<{
  lastAnsweredAt: Date | null;
  questions: { id: string; answeredAt: Date }[];
}> {
  const latestQuestion = await prisma.question.findFirst({
    where: publicAnsweredWhere,
    orderBy: publicQuestionOrderBy,
    select: publicQuestionSitemapSelect,
  });
  const questions =
    take > 0
      ? await prisma.question.findMany({
          where: publicAnsweredWhere,
          orderBy: publicQuestionOrderBy,
          take,
          select: publicQuestionSitemapSelect,
        })
      : [];

  return {
    lastAnsweredAt: latestQuestion ? toPublicQuestionSitemapEntry(latestQuestion).answeredAt : null,
    questions: questions.map((question) => toPublicQuestionSitemapEntry(question)),
  };
}

export async function countAdminQuestions(tab: AdminQuestionTab): Promise<number> {
  return prisma.question.count({ where: getAdminQuestionWhere(tab) });
}

export async function getAdminQuestions({
  tab,
  skip,
  take,
}: {
  tab: AdminQuestionTab;
  skip: number;
  take: number;
}): Promise<AdminQuestionRow[]> {
  return prisma.question.findMany({
    where: getAdminQuestionWhere(tab),
    orderBy: getAdminQuestionOrderBy(tab),
    skip,
    take,
    select: adminQuestionSelect,
  });
}

export async function getAdminQuestionById(id: string): Promise<AdminQuestionRow | null> {
  return prisma.question.findUnique({
    where: { id },
    select: adminQuestionSelect,
  });
}

function getAdminQuestionWhere(tab: AdminQuestionTab): Prisma.QuestionWhereInput {
  return tab === "neodgovorena" ? { answer: null } : { answer: { not: null } };
}

function getAdminQuestionOrderBy(tab: AdminQuestionTab): Prisma.QuestionOrderByWithRelationInput[] {
  return tab === "neodgovorena" ? [{ createdAt: "asc" }] : publicQuestionOrderBy;
}

function toPublicQuestion(question: PublicQuestionRecord): PublicQuestion {
  invariant(
    question.answer !== null && question.answeredAt !== null,
    "Public Q&A query returned a question without a public answer.",
  );

  return {
    id: question.id,
    question: question.question,
    answer: question.answer,
    answeredAt: question.answeredAt,
  };
}

function toPublicQuestionSitemapEntry(question: PublicQuestionSitemapRecord): {
  id: string;
  answeredAt: Date;
} {
  invariant(
    question.answeredAt !== null,
    "Public Q&A sitemap query returned a question without an answered date.",
  );

  return {
    id: question.id,
    answeredAt: question.answeredAt,
  };
}
