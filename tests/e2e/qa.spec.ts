import { expect, test, type Page } from "@playwright/test";

import { adminQaHref, qaQuestionHref } from "../../app/features/qa/qa-routes";
import { ROUTES } from "../../app/lib/routes";
import { prisma } from "../../app/server/db.server";
import {
  QA_PAGINATION_EXTRA_COUNT,
  QA_PAGINATION_EXTRA_PREFIX,
  SEEDED_QA_VISIBLE,
  seedQuestionPaginationExtra,
  type SeededQuestion,
} from "./fixtures/seed-data";
import { loginAsAdmin } from "./utils/admin";

const PUBLIC_SUBMISSION_PREFIX = "E2E javno pitanje kroz formu";
const ADMIN_ANSWER_PREFIX = "E2E pitanje za admin odgovor";
const DYNAMIC_QA_PREFIXES = [PUBLIC_SUBMISSION_PREFIX, ADMIN_ANSWER_PREFIX] as const;
const QA_PAGE_TWO_VISIBLE_COUNT = 20;

test.describe("Q&A", () => {
  // Global Q&A seed stays small; this spec adds enough answered questions
  // to exercise the public load-more pagination flow.
  test.beforeAll(async () => {
    await deleteQuestionsByPrefixes([QA_PAGINATION_EXTRA_PREFIX, ...DYNAMIC_QA_PREFIXES]);
    await prisma.question.createMany({
      data: Array.from({ length: QA_PAGINATION_EXTRA_COUNT }, (_, index) =>
        questionCreateData(seedQuestionPaginationExtra(index)),
      ),
    });
  });

  test.afterEach(async () => {
    await restoreSeedVisibility();
    await deleteQuestionsByPrefixes(DYNAMIC_QA_PREFIXES);
  });

  test.afterAll(async () => {
    await restoreSeedVisibility();
    await deleteQuestionsByPrefixes([QA_PAGINATION_EXTRA_PREFIX, ...DYNAMIC_QA_PREFIXES]);
    await prisma.$disconnect();
  });

  test("public visitor can submit a question and return to an empty form", async ({ page }) => {
    const question = `${PUBLIC_SUBMISSION_PREFIX} ${Date.now()}?`;

    await page.goto(ROUTES.home);
    await page
      .getByRole("banner")
      .getByRole("navigation", { name: "Glavna navigacija" })
      .getByRole("link", { name: "Pitanja i odgovori" })
      .click();

    await expect(page).toHaveURL(exactPath(ROUTES.qa));
    await page.getByLabel("Vaše pitanje").fill(question);
    await page.getByRole("button", { name: "Pošalji pitanje" }).click();

    await expect(page).toHaveURL(exactPath(ROUTES.qaHvala));
    await expect(page.getByRole("heading", { name: "Vaše pitanje je poslano." })).toBeVisible();

    await page.getByRole("link", { name: "Postavi još jedno pitanje" }).click();

    await expect(page).toHaveURL(exactPath(ROUTES.qa));
    await expect(page.getByLabel("Vaše pitanje")).toHaveValue("");
  });

  test("admin can answer a freshly submitted question and publish it publicly", async ({
    page,
  }) => {
    const question = `${ADMIN_ANSWER_PREFIX} ${Date.now()}?`;
    const answer = "Ovo je E2E odgovor koji treba biti prikazan javno nakon spremanja.";

    await submitPublicQuestion(page, question);
    await loginAsAdmin(page);

    await page.goto(ROUTES.adminQa);

    const adminNav = page.getByRole("navigation", { name: "Admin sekcije" });
    await expect(
      adminNav.getByRole("link", { name: /Pitanja, \d+ neodgovorenih pitanja/ }),
    ).toBeVisible();

    const pendingRow = page.getByRole("row").filter({ hasText: question });
    await expect(pendingRow).toBeVisible();
    await pendingRow.getByRole("link", { name: "Odgovori" }).click();

    await expect(page.getByRole("heading", { name: "Odgovori na pitanje" })).toBeVisible();
    await page.getByRole("textbox", { name: "Odgovor" }).fill(answer);
    await page.getByRole("button", { name: "Spremi odgovor" }).click();

    await expect(page).toHaveURL(exactPath(adminQaHref({ tab: "odgovorena" })));
    await expect(page.getByText("Pitanje je odgovoreno i objavljeno.")).toBeVisible();
    await expect(page.getByRole("row").filter({ hasText: question })).toBeVisible();

    await page.context().clearCookies();
    await page.goto(ROUTES.qa);

    await openAccordionQuestion(page, question);
    await expect(page.getByText(answer)).toBeVisible();

    await page.goto(ROUTES.home);
    await expect(page.locator("#qa-home-preview-heading")).toBeVisible();
    await expect(page.getByRole("button", { name: question })).toBeVisible();
  });

  test("admin can hide and unhide an answered question", async ({ page }) => {
    const [seededQuestion] = SEEDED_QA_VISIBLE;
    const questionId = await questionIdByText(seededQuestion.question);

    await loginAsAdmin(page);
    await page.goto(adminQaHref({ tab: "odgovorena" }));

    const answeredRow = page.getByRole("row").filter({ hasText: seededQuestion.question });
    await expect(answeredRow).toBeVisible();
    await answeredRow.getByRole("button", { name: "Sakrij" }).click();

    await expect(page.getByText("Pitanje je sakriveno.")).toBeVisible();

    await page.context().clearCookies();
    await page.goto(ROUTES.qa);
    await expect(page.getByRole("button", { name: seededQuestion.question })).toHaveCount(0);

    const hiddenDetail = await page.goto(qaQuestionHref(questionId));
    expect(hiddenDetail?.status()).toBe(404);
    await expect(page.getByRole("heading", { name: "Sadržaj nije pronađen" })).toBeVisible();

    await loginAsAdmin(page);
    await page.goto(adminQaHref({ tab: "odgovorena" }));

    const hiddenRow = page.getByRole("row").filter({ hasText: seededQuestion.question });
    await expect(hiddenRow).toBeVisible();
    await hiddenRow.getByRole("button", { name: "Prikaži" }).click();

    await expect(page.getByText("Pitanje je vraćeno na javnu listu.")).toBeVisible();

    await page.context().clearCookies();
    await page.goto(ROUTES.qa);
    await expect(page.getByRole("button", { name: seededQuestion.question })).toBeVisible();
  });

  test("load-more page preserves the visible Q&A progress after refresh", async ({ page }) => {
    await page.goto(`${ROUTES.qa}?page=2`);

    const answeredQuestions = page.getByRole("region", { name: "Odgovorena pitanja" });
    await expect(answeredQuestions.locator("article")).toHaveCount(QA_PAGE_TWO_VISIBLE_COUNT);
    await expect(page.getByRole("link", { name: "Učitaj još" })).toBeVisible();

    await page.reload();

    await expect(page).toHaveURL(exactPath(`${ROUTES.qa}?page=2`));
    await expect(answeredQuestions.locator("article")).toHaveCount(QA_PAGE_TWO_VISIBLE_COUNT);
  });

  test("question detail exposes FAQPage JSON-LD and sitemap entries", async ({ page, request }) => {
    const [seededQuestion] = SEEDED_QA_VISIBLE;
    const questionId = await questionIdByText(seededQuestion.question);
    const questionHref = qaQuestionHref(questionId);

    await page.goto(questionHref);

    await expect(page.getByRole("heading", { name: seededQuestion.question })).toBeVisible();

    const jsonLdScripts = await page
      .locator('script[type="application/ld+json"]')
      .allTextContents();
    expect(jsonLdScripts.some((content) => content.includes('"@type":"FAQPage"'))).toBe(true);

    const sitemap = await request.get(ROUTES.sitemapXml);
    expect(sitemap.ok()).toBe(true);

    const body = await sitemap.text();
    expect(body).toContain(ROUTES.qa);
    expect(body).toContain(questionHref);
  });
});

async function submitPublicQuestion(page: Page, question: string) {
  await page.goto(ROUTES.qa);
  await page.getByLabel("Vaše pitanje").fill(question);
  await page.getByRole("button", { name: "Pošalji pitanje" }).click();

  await expect(page).toHaveURL(exactPath(ROUTES.qaHvala));
}

async function openAccordionQuestion(page: Page, question: string) {
  const button = page.getByRole("button", { name: question });

  await expect(button).toBeVisible();
  await button.click();
}

async function questionIdByText(questionText: string): Promise<string> {
  const question = await prisma.question.findFirst({
    where: { question: questionText },
    select: { id: true },
  });

  if (!question) {
    throw new Error(`Expected seeded question "${questionText}" to exist.`);
  }

  return question.id;
}

async function restoreSeedVisibility() {
  const [seededQuestion] = SEEDED_QA_VISIBLE;

  await prisma.question.updateMany({
    where: { question: seededQuestion.question },
    data: { isHidden: false },
  });
}

async function deleteQuestionsByPrefixes(prefixes: readonly string[]) {
  if (prefixes.length === 0) return;

  await prisma.question.deleteMany({
    where: {
      OR: prefixes.map((prefix) => ({
        question: { startsWith: prefix },
      })),
    },
  });
}

function questionCreateData(question: SeededQuestion) {
  return {
    question: question.question,
    answer: question.answer,
    isHidden: question.isHidden,
    answeredAt: question.answeredAt,
    createdAt: question.createdAt,
  };
}

function exactPath(path: string): RegExp {
  return new RegExp(`${escapeRegExp(path)}$`);
}

function escapeRegExp(value: string): string {
  return value.replaceAll(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`);
}
