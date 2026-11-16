import { href } from "react-router";

import { expect, test, type Page } from "@playwright/test";

type TransitionLog = { transitions: string[][] };

const SECTION_ANIMATIONS = ["view-transition-route-out", "view-transition-route-in"];

// Pin light so the theme toggle that proves hydration has a known label.
test.use({ colorScheme: "light" });

test.describe("Public section transitions", () => {
  test.beforeEach(async ({ page }) => {
    await recordViewTransitions(page);
  });

  test("section navigations animate the page; same-section links do not", async ({ page }) => {
    await page.goto(href("/"));
    await proveHydrated(page);
    await takeTransitions(page);

    const mainNavigation = page.getByRole("navigation", { name: "Glavna navigacija" });
    await mainNavigation.getByRole("link", { name: "Objave", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Sve objave" })).toBeVisible();
    await expectSectionTransition(page);

    const hutbeFilter = page.getByRole("link", { name: "Hutbe", exact: true });
    await hutbeFilter.click();
    await expect(hutbeFilter).toHaveAttribute("aria-current", "page");
    expect(await takeTransitions(page)).toEqual([]);

    await page.goBack();
    await expect(page).toHaveURL(/\/objave$/);
    await page.goBack();
    await expect(page.getByRole("heading", { name: "Najnovije objave" })).toBeVisible();
    await expectSectionTransition(page);
  });

  test("a slow section navigation shows progress before it animates", async ({ page }) => {
    let releaseData!: () => void;
    const dataReleased = new Promise<void>((resolve) => {
      releaseData = resolve;
    });

    await page.goto(href("/"));
    await proveHydrated(page);
    await takeTransitions(page);
    await page.route("**/kontakt.data*", async (route) => {
      await dataReleased;
      await route.continue();
    });

    await page
      .getByRole("navigation", { name: "Glavna navigacija" })
      .getByRole("link", { name: "Kontakt", exact: true })
      .click();
    await expect(page.getByRole("progressbar", { name: "Učitavanje stranice" })).toBeVisible();
    expect(await takeTransitions(page)).toEqual([]);

    releaseData();
    await expect(page.getByRole("heading", { name: "O džematu i kontakt" })).toBeVisible();
    await expectSectionTransition(page);
  });
});

async function recordViewTransitions(page: Page) {
  await page.addInitScript(() => {
    const log: TransitionLog = { transitions: [] };
    Object.assign(globalThis, { viewTransitionLog: log });
    const startViewTransition = document.startViewTransition.bind(document);

    document.startViewTransition = (update) => {
      const transition = startViewTransition(update);
      const animations: string[] = [];
      log.transitions.push(animations);
      // A skipped transition rejects `ready`; it stays logged without animations.
      void transition.ready
        .then(() => {
          for (const animation of document.documentElement.getAnimations({ subtree: true })) {
            if (animation instanceof CSSAnimation) animations.push(animation.animationName);
          }
        })
        .catch(() => undefined);

      return transition;
    };
  });
}

async function takeTransitions(page: Page): Promise<string[][]> {
  return page.evaluate(() => {
    const log = (globalThis as typeof globalThis & { viewTransitionLog: TransitionLog })
      .viewTransitionLog;
    const transitions = log.transitions;
    log.transitions = [];

    return transitions;
  });
}

async function expectSectionTransition(page: Page) {
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (globalThis as typeof globalThis & { viewTransitionLog: TransitionLog }).viewTransitionLog
            .transitions,
      ),
    )
    .toEqual([expect.arrayContaining(SECTION_ANIMATIONS)]);
  await takeTransitions(page);
}

// Theme switching needs client JavaScript, so it proves hydration.
async function proveHydrated(page: Page) {
  await page.getByRole("button", { name: "Uključi tamnu temu" }).click();
  await expect(page.locator("html")).toHaveClass(/dark/);
}
