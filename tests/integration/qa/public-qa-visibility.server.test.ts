import { describe, expect, it } from "vitest";

import {
  QA_HOME_PREVIEW_LIMIT,
  QA_PAGE_SIZE,
  QA_RELATED_LIMIT,
  countAdminQuestions,
  countPublicAnsweredQuestions,
  getAdminQuestionById,
  getAdminQuestions,
  getPublicAnsweredQuestions,
  getPublicQuestionById,
  getRelatedPublicQuestions,
  type AdminQuestionRow,
  type AdminQuestionTab,
} from "#app/features/qa/qa.server";

import { createQuestion } from "../../factories";

const rowIds = (rows: AdminQuestionRow[]) => rows.map((row) => row.id);

describe("public Q&A visibility helpers", () => {
  it("exports the public Q&A limits used by routes", () => {
    expect(QA_PAGE_SIZE).toBe(10);
    expect(QA_HOME_PREVIEW_LIMIT).toBe(5);
    expect(QA_RELATED_LIMIT).toBe(5);
  });

  it("returns only answered non-hidden questions in newest answered order", async () => {
    const older = await createQuestion({
      question: "Starije javno pitanje?",
      answer: "Stariji javni odgovor.",
      answeredAt: new Date("2026-05-01T10:00:00.000Z"),
    });
    const hidden = await createQuestion({
      question: "Sakriveno pitanje?",
      answer: "Sakriven odgovor.",
      isHidden: true,
      answeredAt: new Date("2026-05-03T10:00:00.000Z"),
    });
    const unanswered = await createQuestion({
      question: "Neodgovoreno pitanje?",
    });
    const newer = await createQuestion({
      question: "Novije javno pitanje?",
      answer: "Noviji javni odgovor.",
      answeredAt: new Date("2026-05-05T10:00:00.000Z"),
    });

    await expect(countPublicAnsweredQuestions()).resolves.toBe(2);

    const questions = await getPublicAnsweredQuestions();
    expect(questions.map((question) => question.id)).toEqual([newer.id, older.id]);
    expect(questions.map((question) => question.answer)).toEqual([
      "Noviji javni odgovor.",
      "Stariji javni odgovor.",
    ]);

    await expect(getPublicQuestionById(newer.id)).resolves.toMatchObject({
      id: newer.id,
      answer: "Noviji javni odgovor.",
    });
    await expect(getPublicQuestionById(hidden.id)).resolves.toBeNull();
    await expect(getPublicQuestionById(unanswered.id)).resolves.toBeNull();
  });

  it("supports public pagination args and related-question exclusion", async () => {
    const first = await createQuestion({
      question: "Prvo pitanje?",
      answer: "Prvi odgovor.",
      answeredAt: new Date("2026-05-03T10:00:00.000Z"),
    });
    const second = await createQuestion({
      question: "Drugo pitanje?",
      answer: "Drugi odgovor.",
      answeredAt: new Date("2026-05-02T10:00:00.000Z"),
    });
    const third = await createQuestion({
      question: "Treće pitanje?",
      answer: "Treći odgovor.",
      answeredAt: new Date("2026-05-01T10:00:00.000Z"),
    });

    await expect(getPublicAnsweredQuestions({ take: 1, skip: 1 })).resolves.toMatchObject([
      { id: second.id },
    ]);

    const related = await getRelatedPublicQuestions({ excludeId: first.id, take: 5 });
    expect(related.map((question) => question.id)).toEqual([second.id, third.id]);
  });

  it("counts and lists admin questions by derived tabs", async () => {
    const pendingTab: AdminQuestionTab = "neodgovorena";
    const answeredTab: AdminQuestionTab = "odgovorena";
    const pending = await createQuestion({
      question: "Pitanje koje čeka odgovor?",
      createdAt: new Date("2026-05-01T10:00:00.000Z"),
    });
    const answered = await createQuestion({
      question: "Odgovoreno pitanje?",
      answer: "Objavljen odgovor.",
      answeredAt: new Date("2026-05-02T10:00:00.000Z"),
    });

    await expect(countAdminQuestions(pendingTab)).resolves.toBe(1);
    await expect(countAdminQuestions(answeredTab)).resolves.toBe(1);

    const pendingRows = await getAdminQuestions({ tab: pendingTab, skip: 0, take: 20 });
    const answeredRows = await getAdminQuestions({ tab: answeredTab, skip: 0, take: 20 });

    expect(rowIds(pendingRows)).toEqual([pending.id]);
    expect(rowIds(answeredRows)).toEqual([answered.id]);
    await expect(getAdminQuestionById(answered.id)).resolves.toMatchObject({
      id: answered.id,
      answer: "Objavljen odgovor.",
    });
  });
});
