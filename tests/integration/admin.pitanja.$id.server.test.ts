import { describe, expect, it, vi } from "vitest";

import { adminQaAnswerHref, adminQaHref } from "#app/features/qa/qa-routes";
import { getPublicAnsweredQuestions } from "#app/features/qa/qa.server";
import {
  action as adminQaAnswerAction,
  loader as adminQaAnswerLoader,
} from "#app/routes/admin.pitanja.$id";
import { prisma } from "#app/server/db.server";

import { createQuestion } from "../factories";
import { expectData, expectResponse, statusOf } from "../helpers/action-result";
import { createAdminSession, type AdminRouteContext } from "../helpers/auth";
import { callAction as runAction, callLoader as runLoader, testUrl } from "../helpers/route";

function callLoader(id: string, context: AdminRouteContext, url = testUrl(adminQaAnswerHref(id))) {
  return runLoader(adminQaAnswerLoader, {
    url,
    params: { id },
    pattern: "/admin/pitanja/:id",
    context,
  });
}

function callAction(id: string, formData: FormData, context: AdminRouteContext) {
  return runAction(adminQaAnswerAction, {
    url: testUrl(adminQaAnswerHref(id)),
    params: { id },
    pattern: "/admin/pitanja/:id",
    formData,
    context,
  });
}

function answerForm(answer: string) {
  const formData = new FormData();
  formData.set("answer", answer);

  return formData;
}

describe("admin Q&A answer route", () => {
  it("loader returns the question and preserves the source tab for back links", async () => {
    const { context } = await createAdminSession();
    const question = await createQuestion({
      question: "Kako da pošaljem pitanje?",
      answer: "Preko javne forme.",
      answeredAt: new Date("2026-05-02T10:00:00.000Z"),
    });

    const result = expectData(
      await callLoader(
        question.id,
        context,
        testUrl(adminQaAnswerHref(question.id, { from: "odgovorena" })),
      ),
    );

    expect(result.question).toMatchObject({
      id: question.id,
      question: "Kako da pošaljem pitanje?",
      answer: "Preko javne forme.",
    });
    expect(result.backTo).toBe(adminQaHref({ tab: "odgovorena" }));
  });

  it("loader throws 404 for an unknown question id", async () => {
    const { context } = await createAdminSession();

    let thrown: unknown;
    try {
      await callLoader("missing-question", context);
    } catch (error) {
      thrown = error;
    }

    expectResponse(thrown, 404);
  });

  it("saves a first-time answer and makes the question public", async () => {
    const { context } = await createAdminSession();
    const question = await createQuestion({ question: "Kada je sabah?" });

    await expect(getPublicAnsweredQuestions()).resolves.toEqual([]);

    const result = await callAction(question.id, answerForm("Sabah je prema vaktiji."), context);

    expect(result).toBeInstanceOf(Response);
    expect((result as Response).status).toBe(302);
    expect((result as Response).headers.get("Location")).toBe(adminQaHref({ tab: "odgovorena" }));
    expect((result as Response).headers.get("Set-Cookie")).toMatch(/mdz_toast=/);

    const stored = await prisma.question.findUniqueOrThrow({ where: { id: question.id } });
    expect(stored.answer).toBe("Sabah je prema vaktiji.");
    expect(stored.answeredAt).toBeInstanceOf(Date);

    await expect(getPublicAnsweredQuestions()).resolves.toMatchObject([{ id: question.id }]);
  });

  it("edits an existing answer and bumps answeredAt forward", async () => {
    const { context } = await createAdminSession();
    const oldAnsweredAt = new Date("2026-05-02T10:00:00.000Z");
    const question = await createQuestion({
      question: "Da li se odgovor može urediti?",
      answer: "Stari odgovor.",
      answeredAt: oldAnsweredAt,
    });

    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-03T10:00:00.000Z"));
    try {
      const result = await callAction(question.id, answerForm("Novi odgovor."), context);

      expect(result).toBeInstanceOf(Response);
      expect((result as Response).headers.get("Location")).toBe(adminQaHref({ tab: "odgovorena" }));
    } finally {
      vi.useRealTimers();
    }

    const stored = await prisma.question.findUniqueOrThrow({ where: { id: question.id } });
    expect(stored.answer).toBe("Novi odgovor.");
    expect(stored.answeredAt?.getTime()).toBeGreaterThan(oldAnsweredAt.getTime());
  });

  it("rejects invalid answers", async () => {
    const { context } = await createAdminSession();
    const question = await createQuestion({ question: "Pitanje za validaciju?" });

    for (const answer of ["", "abcd", "a".repeat(5001)]) {
      const result = await callAction(question.id, answerForm(answer), context);

      expect(statusOf(result)).toBe(400);
    }

    const stored = await prisma.question.findUniqueOrThrow({ where: { id: question.id } });
    expect(stored.answer).toBeNull();
    expect(stored.answeredAt).toBeNull();
  });

  it("action throws 404 for an unknown question id after valid input", async () => {
    const { context } = await createAdminSession();

    let thrown: unknown;
    try {
      await callAction("missing-question", answerForm("Validan odgovor."), context);
    } catch (error) {
      thrown = error;
    }

    expectResponse(thrown, 404);
  });
});
