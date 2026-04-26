import { expect, test } from "@playwright/test";

import { POSTS_TITLES } from "./global-setup";

test.describe("seo", () => {
  test("post detail shows the article and JSON-LD schema", async ({ page }) => {
    await page.goto("/objave/e2e-objava-1");

    await expect(page.getByRole("heading", { name: POSTS_TITLES[0] })).toBeVisible();
    await expect(page.getByText("Drugi paragraf.")).toBeVisible();
    await expect(page.getByRole("link", { name: "Uredi" })).toHaveCount(0);

    await expect(page.locator('meta[property="og:title"]')).toHaveAttribute(
      "content",
      POSTS_TITLES[0],
    );
    await expect(page.locator('meta[property="og:description"]')).toHaveAttribute(
      "content",
      /Tijelo objave|Drugi paragraf/,
    );
    await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
      "content",
      /\/(slike|logo\.png)/,
    );

    const jsonLd = await page.locator('script[type="application/ld+json"]').textContent();
    expect(jsonLd).toBeTruthy();

    const parsed = JSON.parse(jsonLd!) as { "@type": string; headline: string };
    expect(parsed["@type"]).toBe("Article");
    expect(parsed.headline).toBe(POSTS_TITLES[0]);
  });

  test("robots.txt and sitemap.xml respond correctly", async ({ request }) => {
    const robots = await request.get("/robots.txt");
    expect(robots.ok()).toBe(true);
    expect(await robots.text()).toContain("Sitemap:");

    const sitemap = await request.get("/sitemap.xml");
    expect(sitemap.ok()).toBe(true);
    expect(await sitemap.text()).toContain("/objave/e2e-objava-1");
  });
});
