import { describe, expect, it } from "vitest";

import { HONEYPOT_FIELD, HONEYPOT_TIMESTAMP_FIELD } from "#app/lib/honeypot";
import { ROUTES } from "#app/lib/routes";
import {
  action as qaIndexAction,
  loader as qaIndexLoader,
} from "#app/routes/_public.pitanja-i-odgovori._index";
import { prisma } from "#app/server/db.server";

import { createQuestion } from "../factories";
import { expectData, expectResponse, payloadOf, statusOf } from "../helpers/action-result";
import { withHoneypot } from "../helpers/honeypot";
import { callAction, callLoader, testUrl } from "../helpers/route";

const ENDPOINT = testUrl(ROUTES.qa);

type QaSubmitPayload = {
  result: { error?: Record<string, string[] | undefined> } | null;
  ok: boolean;
  rateLimited: boolean;
};

function questionForm(question: string) {
  const formData = new FormData();
  formData.set("question", question);

  return withHoneypot(formData);
}

async function createAnsweredQuestions(count: number) {
  const base = Date.parse("2026-05-20T12:00:00.000Z");

  for (let index = 0; index < count; index += 1) {
    await createQuestion({
      question: `Javno pitanje ${index + 1}?`,
      answer: `Javni odgovor ${index + 1}.`,
      answeredAt: new Date(base - index * 60_000),
    });
  }
}

describe("public Q&A index route", () => {
  it("returns a fresh honeypot token from the loader", async () => {
    const result = expectData(await callLoader(qaIndexLoader, { url: ENDPOINT }));

    expect(result.honeypot[HONEYPOT_FIELD]).toBe("");
    expect(result.honeypot[HONEYPOT_TIMESTAMP_FIELD]).toMatch(/^\d+\.[\w-]+$/);
  });

  it("returns only answered public questions in newest answered order", async () => {
    const older = await createQuestion({
      question: "Starije javno pitanje?",
      answer: "Stariji javni odgovor.",
      answeredAt: new Date("2026-05-18T10:00:00.000Z"),
    });
    await createQuestion({
      question: "Sakriveno javno pitanje?",
      answer: "Sakriven javni odgovor.",
      isHidden: true,
      answeredAt: new Date("2026-05-20T10:00:00.000Z"),
    });
    await createQuestion({
      question: "Pitanje koje još čeka odgovor?",
    });
    const newer = await createQuestion({
      question: "Novije javno pitanje?",
      answer: "Noviji javni odgovor.",
      answeredAt: new Date("2026-05-21T10:00:00.000Z"),
    });

    const result = expectData(await callLoader(qaIndexLoader, { url: ENDPOINT }));

    expect(result.questions.map((question) => question.id)).toEqual([newer.id, older.id]);
    expect(result.pagination).toMatchObject({
      page: 1,
      totalItems: 2,
      totalPages: 1,
      hasNextPage: false,
    });
  });

  it("keeps earlier questions when loading more pages", async () => {
    const totalItems = 25;
    await createAnsweredQuestions(totalItems);

    const result = expectData(await callLoader(qaIndexLoader, { url: `${ENDPOINT}?page=2` }));

    expect(result.pagination).toMatchObject({
      page: 2,
      totalItems,
      totalPages: 3,
      take: 20,
      visibleItems: 20,
      hasNextPage: true,
    });
    expect(result.questions).toHaveLength(20);
    expect(result.questions[0]?.question).toBe("Javno pitanje 1?");
    expect(result.questions.at(-1)?.question).toBe("Javno pitanje 20?");
  });

  it("redirects out-of-range pages to the last visible batch", async () => {
    await createAnsweredQuestions(13);

    const result = await callLoader(qaIndexLoader, { url: `${ENDPOINT}?page=9` });

    expect(result).toBeInstanceOf(Response);
    expect((result as Response).status).toBe(302);
    expect((result as Response).headers.get("Location")).toBe(`${ROUTES.qa}?page=2`);
  });

  it("returns empty results with safe pagination metadata when no questions are public", async () => {
    const result = expectData(await callLoader(qaIndexLoader, { url: ENDPOINT }));

    expect(result.questions).toEqual([]);
    expect(result.pagination).toMatchObject({
      page: 1,
      totalItems: 0,
      totalPages: 0,
      visibleItems: 0,
      hasNextPage: false,
    });
  });

  it("stores a valid anonymous question and redirects to the thank-you page", async () => {
    const question = "Kako mogu poslati pitanje za imama?";

    const result = await callAction(qaIndexAction, {
      url: ENDPOINT,
      formData: questionForm(question),
      headers: { "fly-client-ip": "203.0.113.31" },
    });

    expect(result).toBeInstanceOf(Response);
    expect((result as Response).status).toBe(303);
    expect((result as Response).headers.get("Location")).toBe(ROUTES.qaHvala);

    const rows = await prisma.question.findMany();
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      question,
      answer: null,
      isHidden: false,
      answeredAt: null,
    });
  });

  it("rejects submissions that fail the honeypot check", async () => {
    const formData = new FormData();
    formData.set("question", "Ovo pitanje nema honeypot token.");

    let thrown: unknown;
    try {
      await callAction(qaIndexAction, {
        url: ENDPOINT,
        formData,
        headers: { "fly-client-ip": "203.0.113.32" },
      });
    } catch (error) {
      thrown = error;
    }

    expectResponse(thrown, 400);
    await expect(prisma.question.count()).resolves.toBe(0);
  });

  it("returns field errors for invalid question text", async () => {
    const cases = [
      { question: "1234", ip: "203.0.113.33", error: /najmanje 5/i },
      { question: "    ", ip: "203.0.113.34", error: /obavezno/i },
      { question: "a".repeat(1001), ip: "203.0.113.35", error: /najviše 1000/i },
    ];

    for (const item of cases) {
      const result = await callAction(qaIndexAction, {
        url: ENDPOINT,
        formData: questionForm(item.question),
        headers: { "fly-client-ip": item.ip },
      });

      expect(statusOf(result)).toBe(400);
      expect(payloadOf<QaSubmitPayload>(result)).toMatchObject({
        ok: false,
        rateLimited: false,
      });
      expect(payloadOf<QaSubmitPayload>(result).result?.error?.question?.[0]).toMatch(item.error);
    }

    await expect(prisma.question.count()).resolves.toBe(0);
  });

  it("rate-limits the sixth submission within an hour from the same IP", async () => {
    const ip = "203.0.113.36";

    for (let attempt = 1; attempt <= 5; attempt += 1) {
      const result = await callAction(qaIndexAction, {
        url: ENDPOINT,
        formData: questionForm(`Validno pitanje broj ${attempt}?`),
        headers: { "fly-client-ip": ip },
      });

      expect(result).toBeInstanceOf(Response);
      expect((result as Response).status).toBe(303);
    }

    const limited = await callAction(qaIndexAction, {
      url: ENDPOINT,
      formData: questionForm("Šesto validno pitanje?"),
      headers: { "fly-client-ip": ip },
    });

    expect(statusOf(limited)).toBe(429);
    expect(payloadOf<QaSubmitPayload>(limited)).toEqual({
      result: null,
      ok: false,
      rateLimited: true,
    });
    await expect(prisma.question.count()).resolves.toBe(5);
  });
});
