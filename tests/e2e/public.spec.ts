import { expect, test } from "@playwright/test";

test.describe("public", () => {
  test("home renders seeded posts and the announcement bar", async ({ page }) => {
    await page.goto("/");

    await expect(page).toHaveTitle("Moj Džemat - Donje Mostre");
    await expect(
      page.getByRole("banner").getByRole("link", { name: "Moj Džemat - Donje Mostre" }),
    ).toBeVisible();
    await expect(page.getByRole("heading", { name: "Objave" })).toBeVisible();
    await expect(page.getByText("Džuma namaz u 13:00")).toBeVisible();
    await expect(page.getByRole("link", { name: /Hutba za petak/ })).toBeVisible();
    await expect(page.getByRole("link", { name: /Dobrodošli u džemat/ })).toBeVisible();
  });

  test("filter query string scopes the feed", async ({ page }) => {
    await page.goto("/?vrsta=hutba");
    await expect(page.getByRole("link", { name: /Hutba za petak/ })).toBeVisible();
    await expect(page.getByRole("link", { name: /Dobrodošli u džemat/ })).toHaveCount(0);
  });

  test("unknown post returns a 404 with the branded ErrorBoundary", async ({ page }) => {
    const response = await page.goto("/objave/nepostojeci-slug");
    expect(response?.status()).toBe(404);
    await expect(page.getByRole("heading", { name: /Stranica nije pronađena/ })).toBeVisible();
  });
});
