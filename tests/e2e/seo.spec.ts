import { expect, test } from "@playwright/test";

import { ROUTES, postHref } from "../../app/lib/routes";
import { POSTS_TITLES } from "./global-setup";

test.describe("seo", () => {
  test("homepage exposes canonical metadata, social image and structured data", async ({
    page,
  }) => {
    await page.goto(ROUTES.home);

    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      "href",
      "http://localhost:3000/",
    );
    await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
      "content",
      "http://localhost:3000/social-card-default.jpg",
    );
    await expect(page.locator('meta[property="og:image:width"]')).toHaveAttribute(
      "content",
      "1200",
    );
    await expect(page.locator('meta[property="og:image:height"]')).toHaveAttribute(
      "content",
      "630",
    );
    await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute("content", "#1a4737");

    // Each shared meta key must appear exactly once. Guards against the
    // class of regression where a route file emits an entry that
    // `buildSocialMeta` also produces (React Router doesn't dedupe).
    await expect(page.locator('meta[property="og:title"]')).toHaveCount(1);
    await expect(page.locator('meta[property="og:description"]')).toHaveCount(1);
    await expect(page.locator('meta[property="og:image"]')).toHaveCount(1);
    await expect(page.locator('link[rel="canonical"]')).toHaveCount(1);

    const jsonLd = await page.locator('script[type="application/ld+json"]').textContent();
    expect(jsonLd).toBeTruthy();
    const parsed = JSON.parse(jsonLd!) as { "@graph": { "@type": string }[] };
    expect(parsed["@graph"].map((entry) => entry["@type"])).toEqual(["Organization", "Place"]);
  });

  test("filtered homepage canonicalizes back to the main listing", async ({ page }) => {
    await page.goto(`${ROUTES.home}?vrsta=hutba`);

    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", "noindex,follow");
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      "href",
      "http://localhost:3000/",
    );
  });

  test("post detail shows the article and JSON-LD schema", async ({ page }) => {
    await page.goto(postHref("e2e-objava-1"));

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
      /\/(slike|social-card-default\.jpg)/,
    );

    // Same duplicate-key guard as the homepage test — this is the page
    // that hit the dupe-meta bug (route file listed og:title/og:description
    // standalone alongside the buildSocialMeta spread).
    await expect(page.locator('meta[property="og:title"]')).toHaveCount(1);
    await expect(page.locator('meta[property="og:description"]')).toHaveCount(1);
    await expect(page.locator('meta[property="og:image"]')).toHaveCount(1);
    await expect(page.locator('link[rel="canonical"]')).toHaveCount(1);

    const jsonLd = await page.locator('script[type="application/ld+json"]').textContent();
    expect(jsonLd).toBeTruthy();

    const parsed = JSON.parse(jsonLd!) as { "@type": string; headline: string };
    expect(parsed["@type"]).toBe("Article");
    expect(parsed.headline).toBe(POSTS_TITLES[0]);
  });

  test("robots.txt and sitemap.xml respond correctly", async ({ request }) => {
    const robots = await request.get(ROUTES.robotsTxt);
    expect(robots.ok()).toBe(true);
    expect(await robots.text()).toContain("Sitemap:");

    const sitemap = await request.get(ROUTES.sitemapXml);
    expect(sitemap.ok()).toBe(true);
    expect(await sitemap.text()).toContain(postHref("e2e-objava-1"));
  });
});
