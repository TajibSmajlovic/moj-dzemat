import { describe, expect, it } from "vitest";

import { loader as qaDetailLoader } from "#app/routes/_public.pitanja-i-odgovori.$id";

import { createQuestion } from "../../factories";
import { expectData, expectResponse } from "../../helpers/action-result";
import { callLoader, testUrl } from "../../helpers/route";

function loadQuestion(id: string) {
  return callLoader(qaDetailLoader, {
    url: testUrl(`/pitanja-i-odgovori/${id}`),
    params: { id },
    pattern: "/pitanja-i-odgovori/:id",
  });
}

describe("public Q&A detail route", () => {
  it("returns 404 for an unknown question id", async () => {
    let thrown: unknown;

    try {
      await loadQuestion("missing-question-id");
    } catch (error) {
      thrown = error;
    }

    expectResponse(thrown, 404);
  });

  it("returns 404 for unanswered questions", async () => {
    const question = await createQuestion({
      question: "Pitanje koje još nema odgovor?",
    });

    let thrown: unknown;
    try {
      await loadQuestion(question.id);
    } catch (error) {
      thrown = error;
    }

    expectResponse(thrown, 404);
  });

  it("returns 404 for answered hidden questions", async () => {
    const question = await createQuestion({
      question: "Sakriveno odgovoreno pitanje?",
      answer: "Odgovor koji nije javno vidljiv.",
      isHidden: true,
      answeredAt: new Date("2026-05-20T10:00:00.000Z"),
    });

    let thrown: unknown;
    try {
      await loadQuestion(question.id);
    } catch (error) {
      thrown = error;
    }

    expectResponse(thrown, 404);
  });

  it("returns the public question and latest related public questions", async () => {
    const current = await createQuestion({
      question: "Glavno javno pitanje?",
      answer: "Glavni javni odgovor.",
      answeredAt: new Date("2026-05-10T10:00:00.000Z"),
    });
    const base = Date.parse("2026-05-20T10:00:00.000Z");

    for (let index = 0; index < 7; index += 1) {
      await createQuestion({
        question: `Povezano pitanje ${index + 1}?`,
        answer: `Povezani odgovor ${index + 1}.`,
        answeredAt: new Date(base - index * 60_000),
      });
    }
    await createQuestion({
      question: "Sakriveno povezano pitanje?",
      answer: "Sakriven odgovor.",
      isHidden: true,
      answeredAt: new Date("2026-05-21T10:00:00.000Z"),
    });
    await createQuestion({ question: "Neodgovoreno povezano pitanje?" });

    const result = expectData(await loadQuestion(current.id));

    expect(result.question).toMatchObject({
      id: current.id,
      question: "Glavno javno pitanje?",
      answer: "Glavni javni odgovor.",
    });
    expect(result.related).toHaveLength(5);
    expect(result.related.map((question) => question.question)).toEqual([
      "Povezano pitanje 1?",
      "Povezano pitanje 2?",
      "Povezano pitanje 3?",
      "Povezano pitanje 4?",
      "Povezano pitanje 5?",
    ]);
    expect(result.related.map((question) => question.id)).not.toContain(current.id);
  });
});
