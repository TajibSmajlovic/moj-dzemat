import { expect, test } from "@playwright/test";

import { POSTS_TITLES } from "./global-setup";

test.describe("public", () => {
  test("home renders seeded posts and the announcement bar", async ({ page }) => {
    await page.goto("/");

    await expect(page).toHaveTitle("Moj Džemat - Donje Mostre");
    await expect(
      page.getByRole("banner").getByRole("link", { name: "Moj Džemat - Donje Mostre" }),
    ).toBeVisible();
    await expect(page.getByRole("heading", { name: "Objave" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Gdje se nalazimo" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Otvori u Google Maps" })).toBeVisible();
    await expect(page.getByText("Džuma namaz u 13:00")).toBeVisible();

    // First 6 post cards are can be seein in the viewport, the rest can be seen by scrolling
    for (const title of POSTS_TITLES.slice(0, 6)) {
      await expect(page.getByRole("heading", { level: 3, name: title })).toBeVisible();
    }
  });

  test("filter query string scopes the feed", async ({ page }) => {
    await page.goto("/?vrsta=hutba");
    await expect(page.getByText("Nema objava u ovoj kategoriji.")).toBeVisible();

    await page.goto("/?vrsta=smrtovnica");
    await expect(page.getByText("Nema objava u ovoj kategoriji.")).toBeVisible();

    await page.goto("/?vrsta=obavijest");
    await expect(page.getByText("Nema objava u ovoj kategoriji.")).toHaveCount(0);
    await expect(page.getByRole("heading", { level: 3, name: POSTS_TITLES[0] })).toBeVisible();
  });

  test("unknown post returns a 404 with the branded ErrorBoundary", async ({ page }) => {
    const response = await page.goto("/objave/nepostojeci-slug");

    expect(response?.status()).toBe(404);
    await expect(page.getByRole("heading", { name: /Stranica nije pronađena/ })).toBeVisible();
  });
});
