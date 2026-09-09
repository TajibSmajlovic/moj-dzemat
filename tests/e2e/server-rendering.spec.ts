import { href } from "react-router";

import { expect, test, type Locator } from "@playwright/test";

import { postHref } from "../../app/features/posts/post-routes";
import { prisma } from "../../app/server/db.server";
import { SEEDED_POSTS } from "./fixtures/seed-posts";
import { SEEDED_QA_VISIBLE } from "./fixtures/seed-qa";

const FEATURED_SLUG = "e2e-server-rendered-featured";
const FEATURED_TITLE = "Istaknuta objava prije JavaScripta";

test.beforeAll(async () => {
  await prisma.post.create({
    data: {
      slug: FEATURED_SLUG,
      title: FEATURED_TITLE,
      body: "<p>Važna obavijest dostupna odmah.</p>",
      type: "obavijest",
      status: "published",
      featured: true,
      publishedAt: new Date("2000-01-01"),
    },
  });
});

test.afterAll(async () => {
  await prisma.post.deleteMany({ where: { slug: FEATURED_SLUG } });
  await prisma.$disconnect();
});

for (const viewport of [
  { width: 390, height: 844 },
  { width: 1440, height: 1000 },
]) {
  test.describe(`server rendering at ${viewport.width}px`, () => {
    test.use({ viewport });

    test("public reading and authentication forms work without JavaScript", async ({
      browser,
      baseURL,
    }) => {
      const context = await browser.newContext({
        baseURL,
        viewport,
        javaScriptEnabled: false,
        serviceWorkers: "block",
      });
      const page = await context.newPage();

      try {
        await page.goto(href("/"));
        await expect(page).toHaveTitle("Moj Džemat - Donje Mostre");
        await expectReadable(page.getByRole("heading", { name: FEATURED_TITLE }));
        await expectReadable(page.getByText("Važna obavijest dostupna odmah."));
        await expectReadable(page.getByRole("heading", { name: "Gdje se nalazimo" }));

        await page.getByRole("link", { name: FEATURED_TITLE }).click();
        await expect(page).toHaveURL(postHref(FEATURED_SLUG));
        await expectReadable(page.getByRole("heading", { name: FEATURED_TITLE }));

        await page.goto(href("/"));
        await page.getByRole("link", { name: "Hutbe", exact: true }).click();
        await expectReadable(page.getByRole("heading", { name: "Najnovije hutbe" }));
        const hutba = SEEDED_POSTS.find((post) => post.type === "hutba")!;
        await expectReadable(page.getByRole("heading", { name: hutba.title }));
        await page.getByRole("link", { name: "Pogledaj sve objave" }).click();
        await expectReadable(page.getByRole("heading", { name: "Sve objave" }));
        await page.getByRole("link", { name: "Hutbe", exact: true }).click();
        await expectReadable(page.getByRole("heading", { name: "Sve hutbe" }));

        await page.goto(href("/pitanja-i-odgovori"));
        await expectReadable(
          page.getByRole("heading", { name: "Pitanja i odgovori", exact: true }),
        );
        const [first, second] = SEEDED_QA_VISIBLE;
        const firstTrigger = page.locator("summary").filter({ hasText: first.question });
        const secondTrigger = page.locator("summary").filter({ hasText: second.question });
        await firstTrigger.focus();
        await page.keyboard.press("Enter");
        const firstAnswer = page.getByRole("region", { name: first.question });
        await expectReadable(firstAnswer.getByText(first.answer!));
        await secondTrigger.click();
        await expect(firstAnswer).toBeHidden();
        const secondAnswer = page.getByRole("region", { name: second.question });
        await expectReadable(secondAnswer.getByText(second.answer!));
        await secondAnswer.getByRole("link", { name: "Otvori", exact: true }).click();
        await expectReadable(page.getByRole("heading", { name: second.question, exact: true }));

        await page.goto(href("/kontakt"));
        await expectReadable(page.getByRole("heading", { name: "O džematu i kontakt" }));
        await expectReadable(page.getByRole("link", { name: "Otvori u Google Maps" }));

        await page.goto(href("/prijava"));
        await expectReadable(page.getByRole("heading", { name: "Prijava za uredništvo" }));
        await expectReadable(page.getByLabel("E-mail"));
        await expectReadable(page.getByLabel("Lozinka", { exact: true }));
        await page.getByLabel("E-mail").fill("missing-ssr-account@example.com");
        await page.getByLabel("Lozinka", { exact: true }).fill("Synthetic-invalid-password");
        await page.getByRole("button", { name: "Prijavi se", exact: true }).click();
        await expectReadable(page.getByText("Pogrešna e-mail adresa ili lozinka."));

        await page.goto(href("/zaboravljena-lozinka"));
        await expectReadable(page.getByLabel("E-mail"));
        await expectReadable(page.getByRole("button", { name: "Pošalji link" }));
        await page.goto("/nova-lozinka/synthetic-invalid-token");
        await expectReadable(page.getByRole("heading", { name: "Link nije važeći" }));
      } finally {
        await context.close();
      }
    });

    test("delayed hydration keeps visible content and preserves an opened answer", async ({
      page,
    }) => {
      let releaseScripts!: () => void;
      const scriptsReady = new Promise<void>((resolve) => {
        releaseScripts = resolve;
      });
      const errors: string[] = [];
      page.on("pageerror", (error) => errors.push(error.message));
      await page.route("**/*", async (route) => {
        if (route.request().resourceType() === "script") await scriptsReady;
        await route.continue();
      });

      try {
        await page.goto(href("/"), { waitUntil: "commit" });
        const title = page.getByRole("heading", { name: FEATURED_TITLE });
        await expectReadable(title);
        const question = SEEDED_QA_VISIBLE[0];
        const trigger = page.locator("summary").filter({ hasText: question.question });
        await trigger.click();
        const answer = page.getByRole("region", { name: question.question });
        await expectReadable(answer.getByText(question.answer!));

        await title.evaluate((element) => {
          const audit = { hidden: false };
          Object.assign(globalThis, { hydrationAudit: audit });
          const observer = new MutationObserver(() => {
            for (let node: Element | null = element; node; node = node.parentElement) {
              if (getComputedStyle(node).opacity === "0") audit.hidden = true;
            }
          });
          observer.observe(document.body, { subtree: true, attributes: true });
        });

        releaseScripts();
        await page.waitForLoadState("load");
        await page.getByRole("button", { name: "Uključi tamnu temu" }).click();
        await expect(page.locator("html")).toHaveClass(/dark/);
        await expectReadable(title);
        await expectReadable(answer.getByText(question.answer!));
        expect(
          await page.evaluate(
            () =>
              (globalThis as typeof globalThis & { hydrationAudit: { hidden: boolean } })
                .hydrationAudit.hidden,
          ),
        ).toBe(false);
        expect(errors).toEqual([]);

        await trigger.click();
        await expect(answer).toBeHidden();
        await page.getByRole("link", { name: "Hutbe", exact: true }).click();
        await expectReadable(page.getByRole("heading", { name: "Najnovije hutbe" }));
      } finally {
        releaseScripts();
        await page.unrouteAll({ behavior: "wait" });
      }
    });
  });
}

async function expectReadable(locator: Locator) {
  await expect(locator).toBeVisible();
  // Playwright's visibility check does not reject a zero-opacity ancestor.
  await expect
    .poll(() =>
      locator.evaluate((element) => {
        let opacity = 1;
        for (let node: Element | null = element; node; node = node.parentElement) {
          opacity *= Number(getComputedStyle(node).opacity);
        }
        return opacity;
      }),
    )
    .toBe(1);
}
