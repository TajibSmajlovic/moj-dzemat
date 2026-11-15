import { href } from "react-router";

import { expect, test } from "@playwright/test";

import { postHref } from "../../app/features/posts/post-routes";
import { dzemat, PRODUCT_NAME, SITE_NAME } from "../../app/lib/branding";
import { DZEMAT_LOCATION } from "../../app/lib/maps";
import { SOCIAL_LINKS } from "../../app/lib/social-links";
import { SEEDED_ANNOUNCEMENT_MESSAGE } from "./fixtures/seed-announcements";
import { POSTS_TITLES, SEEDED_POSTS } from "./fixtures/seed-posts";

function seededPostOfType(type: (typeof SEEDED_POSTS)[number]["type"]) {
  const post = SEEDED_POSTS.find((seededPost) => seededPost.type === type);
  if (!post) throw new Error(`Expected a seeded ${type} post.`);

  return post;
}

test.describe("public", () => {
  test("home renders seeded posts and the announcement bar", async ({ page }) => {
    await page.goto(href("/"));

    await expect(page).toHaveTitle(SITE_NAME);
    const homeLink = page.getByRole("banner").getByRole("link", { name: /Moj Džemat/ });
    await expect(homeLink).toHaveAccessibleName(
      `${dzemat.logoAlt} ${PRODUCT_NAME} ${dzemat.name} ${dzemat.tagline}`,
    );
    await expect(homeLink).toHaveAttribute("href", "/");
    await expect(page.getByRole("heading", { name: "Najnovije objave" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Gdje se nalazimo" })).toHaveCount(
      DZEMAT_LOCATION ? 1 : 0,
    );
    await expect(page.getByRole("link", { name: "Otvori u Google Maps" })).toHaveCount(
      DZEMAT_LOCATION ? 1 : 0,
    );
    await expect(page.getByText(SEEDED_ANNOUNCEMENT_MESSAGE)).toBeVisible();
    await expect(page.getByRole("link", { name: "Pogledaj sve objave" })).toBeVisible();

    for (const title of POSTS_TITLES.slice(0, 6)) {
      await expect(page.getByRole("heading", { level: 3, name: title })).toBeVisible();
    }
  });

  test("mobile home keeps community information within reach and links to older posts", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(href("/"));

    const cards = page.getByRole("region", { name: "Lista objava" }).locator("article");
    await expect(cards).toHaveCount(6);
    const firstCard = await cards.first().boundingBox();
    expect(firstCard?.height).toBeLessThan(300);

    const dates = await page
      .getByRole("heading", { name: "Važni datumi", exact: true })
      .boundingBox();
    const questions = await page
      .getByRole("heading", { name: "Pitanja i odgovori", exact: true })
      .boundingBox();
    expect(dates?.y).toBeLessThan(questions!.y);
    expect(questions?.y).toBeLessThan(3 * 844);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth),
    ).toBe(false);

    await page.getByRole("link", { name: "Pogledaj sve objave" }).click();
    await expect(page).toHaveURL(href("/objave"));
    await expect(page.getByRole("heading", { name: POSTS_TITLES[6], exact: true })).toBeVisible();
  });

  test("desktop navigation exposes primary links and secondary actions", async ({ page }) => {
    await page.goto(href("/"));

    const banner = page.getByRole("banner");
    await expect(
      banner.getByRole("navigation", { name: "Glavna navigacija" }).getByRole("link", {
        name: "Početna",
      }),
    ).toHaveAttribute("aria-current", "page");
    await expect(banner.getByRole("link", { name: "Objave" })).toBeVisible();
    await expect(banner.getByRole("link", { name: "Pitanja i odgovori" })).toBeVisible();
    await expect(banner.getByRole("link", { name: "Kontakt" })).toBeVisible();
    const socialNavigation = banner.getByRole("navigation", { name: "Društvene mreže" });
    await expect(socialNavigation.getByRole("link")).toHaveCount(SOCIAL_LINKS.length);
    for (const socialLink of SOCIAL_LINKS) {
      await expect(socialNavigation.getByRole("link", { name: socialLink.label })).toHaveAttribute(
        "href",
        socialLink.href,
      );
    }
    await expect(banner.getByRole("link", { name: "Admin" })).toBeVisible();
  });

  test("filter query string scopes the feed", async ({ page }) => {
    const firstObavijest = seededPostOfType("obavijest");
    const firstHutba = seededPostOfType("hutba");
    const firstSmrtovnica = seededPostOfType("smrtovnica");

    await page.goto(`${href("/")}?vrsta=hutba`);
    await expect(page.getByText("Nema objava u ovoj kategoriji.")).toHaveCount(0);
    await expect(page.getByRole("heading", { level: 3, name: firstHutba.title })).toBeVisible();
    await expect(page.getByRole("heading", { level: 3, name: firstObavijest.title })).toHaveCount(
      0,
    );

    await page.goto(`${href("/")}?vrsta=smrtovnica`);
    await expect(page.getByText("Nema objava u ovoj kategoriji.")).toHaveCount(0);
    await expect(
      page.getByRole("heading", { level: 3, name: firstSmrtovnica.title }),
    ).toBeVisible();
    await expect(page.getByRole("heading", { level: 3, name: firstHutba.title })).toHaveCount(0);

    await page.goto(`${href("/")}?vrsta=obavijest`);
    await expect(page.getByText("Nema objava u ovoj kategoriji.")).toHaveCount(0);
    await expect(page.getByRole("heading", { level: 3, name: firstObavijest.title })).toBeVisible();
  });

  test("unknown post returns a 404 with the branded ErrorBoundary", async ({ page }) => {
    const response = await page.goto(postHref("nepostojeci-slug"));

    expect(response?.status()).toBe(404);
    await expect(page.getByRole("heading", { name: /Sadržaj nije pronađen/ })).toBeVisible();
  });
});
