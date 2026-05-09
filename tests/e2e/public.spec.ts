import { expect, test } from "@playwright/test";

import { POSTS_TITLES } from "./global-setup";

test.describe("public", () => {
  test("home renders seeded posts and the announcement bar", async ({ page }) => {
    await page.goto("/");

    await expect(page).toHaveTitle("Moj Džemat - Donje Mostre");
    await expect(
      page.getByRole("banner").getByRole("link", { name: "Moj Džemat - Donje Mostre" }),
    ).toBeVisible();
    await expect(page.getByRole("heading", { name: "Najnovije objave" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Gdje se nalazimo" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Otvori u Google Maps" })).toBeVisible();
    await expect(page.getByText("Džuma namaz u 13:00")).toBeVisible();
    await expect(page.getByRole("link", { name: "Pogledaj sve objave" })).toBeVisible();

    // First 6 post cards can be seen in the viewport, the rest can be seen by scrolling.
    for (const title of POSTS_TITLES.slice(0, 6)) {
      await expect(page.getByRole("heading", { level: 3, name: title })).toBeVisible();
    }
  });

  test("desktop navigation exposes primary links and secondary actions", async ({ page }) => {
    await page.goto("/");

    const banner = page.getByRole("banner");
    await expect(
      banner.getByRole("navigation", { name: "Glavna navigacija" }).getByRole("link", {
        name: "Početna",
      }),
    ).toHaveAttribute("aria-current", "page");
    await expect(banner.getByRole("link", { name: "Objave" })).toBeVisible();
    await expect(banner.getByRole("link", { name: "Facebook" })).toBeVisible();
    await expect(banner.getByRole("link", { name: "Admin" })).toBeVisible();
  });

  test("mobile navigation opens a top dropdown and navigates to posts", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");

    const menuButton = page.getByRole("button", { name: "Otvori meni" });
    await expect(menuButton).toHaveAttribute("aria-expanded", "false");
    await expect(page.getByRole("navigation", { name: "Mobilna navigacija" })).toHaveCount(0);

    await menuButton.click();

    const dropdown = page.getByRole("navigation", { name: "Mobilna navigacija" });
    await expect(page.getByRole("button", { name: "Zatvori meni" })).toHaveAttribute(
      "aria-expanded",
      "true",
    );
    await expect(dropdown).toBeVisible();
    await expect(dropdown.getByRole("link", { name: "Početna" })).toBeVisible();
    await expect(dropdown.getByRole("link", { name: "Objave" })).toBeVisible();
    await expect(dropdown.getByRole("link", { name: "Admin" })).toBeVisible();

    await dropdown.getByRole("link", { name: "Objave" }).click();

    await expect(page).toHaveURL(/\/objave$/);
    await expect(page.getByRole("button", { name: "Otvori meni" })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
    await expect(page.getByRole("navigation", { name: "Mobilna navigacija" })).toHaveCount(0);
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
