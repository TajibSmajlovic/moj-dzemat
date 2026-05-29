import { data } from "react-router";

import {
  countAdminQuestions,
  getAdminQuestions,
  type AdminQuestionTab,
} from "#app/features/qa/qa.server";
import { invariantResponse } from "#app/lib/invariant";
import { getPaginationState, ADMIN_QUESTIONS_PAGE_SIZE } from "#app/lib/pagination";
import { createActionToast } from "#app/lib/toast";
import { isPrismaNotFoundError, prisma } from "#app/server/db.server";
import { logger } from "#app/server/logger.server";

type AdminQaListArgs = {
  tab: AdminQuestionTab;
  page: number;
};

export async function getAdminQaListPage({ tab, page }: AdminQaListArgs) {
  const totalItems = await countAdminQuestions(tab);
  const pagination = getPaginationState({
    page,
    pageSize: ADMIN_QUESTIONS_PAGE_SIZE,
    totalItems,
  });

  const questions =
    totalItems > 0
      ? await getAdminQuestions({
          tab,
          skip: pagination.skip,
          take: pagination.pageSize,
        })
      : [];

  return { questions, pagination };
}

export async function getAdminQaCounts(tab: AdminQuestionTab, currentTabTotal: number) {
  const [pending, answered] = await Promise.all([
    tab === "neodgovorena" ? currentTabTotal : countAdminQuestions("neodgovorena"),
    tab === "odgovorena" ? currentTabTotal : countAdminQuestions("odgovorena"),
  ]);

  return { pending, answered };
}

export async function toggleAdminQuestionHidden(questionId: string, userId: string) {
  const question = await prisma.question.findUnique({
    where: { id: questionId },
    select: { answer: true, isHidden: true },
  });

  invariantResponse(question, "Pitanje nije pronađeno.", { status: 404 });

  if (question.answer === null) {
    return data(
      {
        ok: false,
        toast: createActionToast({
          action: "error",
          description: "Neodgovoreno pitanje se ne može sakriti.",
        }),
      },
      { status: 400 },
    );
  }

  const nextHidden = !question.isHidden;

  await prisma.question.update({
    where: { id: questionId },
    data: { isHidden: nextHidden },
  });

  logger.info({ questionId, userId, isHidden: nextHidden }, "qa question visibility toggled");

  return {
    ok: true,
    toast: createActionToast({
      action: "update",
      description: nextHidden ? "Pitanje je sakriveno." : "Pitanje je vraćeno na javnu listu.",
    }),
  };
}

export async function deleteAdminQuestion(questionId: string, userId: string) {
  let deleted: { question: string };

  try {
    deleted = await prisma.question.delete({
      where: { id: questionId },
      select: { question: true },
    });
  } catch (error) {
    if (isPrismaNotFoundError(error)) {
      invariantResponse(false, "Pitanje nije pronađeno.", { status: 404 });
    }

    throw error;
  }

  logger.info({ questionId, userId }, "qa question deleted");

  return {
    ok: true,
    toast: createActionToast({
      action: "delete",
      description: `Pitanje "${deleted.question}" je obrisano.`,
    }),
  };
}

export async function saveAdminQuestionAnswer({
  questionId,
  answer,
  userId,
}: {
  questionId: string;
  answer: string;
  userId: string;
}) {
  const question = await prisma.question.findUnique({
    where: { id: questionId },
    select: { answer: true },
  });

  invariantResponse(question, "Pitanje nije pronađeno.", { status: 404 });

  const wasAnswered = question.answer !== null;

  try {
    await prisma.question.update({
      where: { id: questionId },
      data: { answer, answeredAt: new Date() },
    });
  } catch (error) {
    if (isPrismaNotFoundError(error)) {
      invariantResponse(false, "Pitanje nije pronađeno.", { status: 404 });
    }

    throw error;
  }

  logger.info({ questionId, userId, edit: wasAnswered }, "qa answer saved");

  return { wasAnswered };
}
