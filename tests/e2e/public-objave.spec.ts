import { expect, test } from "@playwright/test";

import { PUBLIC_POSTS_PAGE_SIZE } from "../../app/lib/pagination";
import { ROUTES } from "../../app/lib/routes";

test.describe("Public objave", () => {
  test("loads initial batch, appends on load more, preserves on refresh", async ({ page }) => {
    await page.goto(ROUTES.posts);

    const items = page.locator('[aria-label="Lista objava"] > *');
    await expect(items).toHaveCount(PUBLIC_POSTS_PAGE_SIZE);
    const initialTitles = await items.getByRole("heading").allTextContents();

    const loadMore = page.getByRole("link", { name: "Učitaj više" });
    await expect(loadMore).toBeVisible();

    await loadMore.click();

    await expect(page).toHaveURL(/\?(.+&)?page=2($|&|#)/);
    await expect(items).toHaveCount(PUBLIC_POSTS_PAGE_SIZE * 2);

    const loadedTitles = await items.getByRole("heading").allTextContents();
    expect(loadedTitles.slice(0, PUBLIC_POSTS_PAGE_SIZE)).toEqual(initialTitles);

    await page.reload();
    await expect(items).toHaveCount(PUBLIC_POSTS_PAGE_SIZE * 2);
  });
});
