import { describe, expect, it } from "vitest";

import { adminQaHref } from "#app/features/qa/qa-routes";
import { getPublicAnsweredQuestions } from "#app/features/qa/qa.server";
import { ADMIN_QUESTIONS_PAGE_SIZE } from "#app/lib/pagination";
import { ROUTES } from "#app/lib/routes";
import { action as adminQaAction, loader as adminQaLoader } from "#app/routes/admin.pitanja._index";
import { prisma } from "#app/server/db.server";

import { createQuestion, createUser } from "../factories";
import { expectData, statusOf } from "../helpers/action-result";
import { callAction as runAction, callLoader as runLoader, testUrl } from "../helpers/route";
import { sessionCookieFor } from "../helpers/session";

const ENDPOINT = testUrl(ROUTES.adminQa);

async function adminCookie() {
  const { user } = await createUser();

  return sessionCookieFor(user.id);
}

function callLoader(url: string, cookie: string) {
  return runLoader(adminQaLoader, { url, cookie });
}

function callAction(formData: FormData, cookie: string) {
  return runAction(adminQaAction, { url: ENDPOINT, formData, cookie });
}

function actionForm(intent: string, id: string) {
  const formData = new FormData();
  formData.set("intent", intent);
  formData.set("id", id);

  return formData;
}

describe("admin Q&A list route", () => {
  it("defaults to unanswered questions and filters answered tab", async () => {
    const cookie = await adminCookie();
    const pending = await createQuestion({
      question: "Pitanje koje čeka odgovor?",
      createdAt: new Date("2026-05-01T10:00:00.000Z"),
    });
    const answered = await createQuestion({
      question: "Odgovoreno pitanje?",
      answer: "Objavljen odgovor.",
      answeredAt: new Date("2026-05-02T10:00:00.000Z"),
    });

    const defaultTab = expectData(await callLoader(ENDPOINT, cookie));
    expect(defaultTab.tab).toBe("neodgovorena");
    expect(defaultTab.questions.map((question) => question.id)).toEqual([pending.id]);
    expect(defaultTab.counts).toEqual({ pending: 1, answered: 1 });

    const answeredTab = expectData(await callLoader(`${ENDPOINT}?tab=odgovorena`, cookie));
    expect(answeredTab.tab).toBe("odgovorena");
    expect(answeredTab.questions.map((question) => question.id)).toEqual([answered.id]);
    expect(answeredTab.counts).toEqual({ pending: 1, answered: 1 });
  });

  it("paginates admin questions by the configured page size", async () => {
    const cookie = await adminCookie();

    for (let index = 0; index < ADMIN_QUESTIONS_PAGE_SIZE + 3; index += 1) {
      await createQuestion({
        question: `Pitanje za paginaciju ${index + 1}?`,
        createdAt: new Date(Date.parse("2026-05-01T10:00:00.000Z") + index * 60_000),
      });
    }

    const firstPage = expectData(await callLoader(ENDPOINT, cookie));
    expect(firstPage.pagination).toMatchObject({
      page: 1,
      totalItems: ADMIN_QUESTIONS_PAGE_SIZE + 3,
      totalPages: 2,
      rangeStart: 1,
      rangeEnd: ADMIN_QUESTIONS_PAGE_SIZE,
    });
    expect(firstPage.questions).toHaveLength(ADMIN_QUESTIONS_PAGE_SIZE);

    const secondPage = expectData(await callLoader(`${ENDPOINT}?page=2`, cookie));
    expect(secondPage.questions).toHaveLength(3);
  });

  it("redirects out-of-range pages to the last valid page", async () => {
    const cookie = await adminCookie();

    for (let index = 0; index < ADMIN_QUESTIONS_PAGE_SIZE + 1; index += 1) {
      await createQuestion({ question: `Pitanje ${index + 1}?` });
    }

    const result = await callLoader(`${ENDPOINT}?page=9`, cookie);

    expect(result).toBeInstanceOf(Response);
    expect((result as Response).status).toBe(302);
    expect((result as Response).headers.get("Location")).toBe(adminQaHref({ page: 2 }));
  });

  it("rejects hide toggles on unanswered questions", async () => {
    const cookie = await adminCookie();
    const pending = await createQuestion({ question: "Neodgovoreno pitanje?" });

    const result = await callAction(actionForm("toggle-hidden", pending.id), cookie);

    expect(statusOf(result)).toBe(400);
    await expect(prisma.question.findUnique({ where: { id: pending.id } })).resolves.toMatchObject({
      isHidden: false,
    });
  });

  it("toggles answered question visibility and public availability", async () => {
    const cookie = await adminCookie();
    const answered = await createQuestion({
      question: "Javno odgovoreno pitanje?",
      answer: "Javni odgovor.",
      answeredAt: new Date("2026-05-02T10:00:00.000Z"),
    });

    await expect(getPublicAnsweredQuestions()).resolves.toMatchObject([{ id: answered.id }]);

    const hide = await callAction(actionForm("toggle-hidden", answered.id), cookie);
    expect(hide).toMatchObject({ ok: true });
    await expect(getPublicAnsweredQuestions()).resolves.toEqual([]);

    const show = await callAction(actionForm("toggle-hidden", answered.id), cookie);
    expect(show).toMatchObject({ ok: true });
    await expect(getPublicAnsweredQuestions()).resolves.toMatchObject([{ id: answered.id }]);
  });

  it("deletes a question", async () => {
    const cookie = await adminCookie();
    const question = await createQuestion({
      question: "Pitanje za brisanje?",
      answer: "Odgovor za brisanje.",
      answeredAt: new Date("2026-05-02T10:00:00.000Z"),
    });

    const result = await callAction(actionForm("delete", question.id), cookie);

    expect(result).toMatchObject({ ok: true });
    await expect(prisma.question.findUnique({ where: { id: question.id } })).resolves.toBeNull();
  });
});
