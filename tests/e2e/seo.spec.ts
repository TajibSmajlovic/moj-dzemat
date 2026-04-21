import { expect, test } from "@playwright/test";

test.describe("seo", () => {
  test("post detail shows the article and JSON-LD schema", async ({ page }) => {
    await page.goto("/objave/petak-hutba");

    await expect(page.getByRole("heading", { name: "Hutba za petak" })).toBeVisible();
    await expect(page.getByText("Drugi pasus hutbe.")).toBeVisible();
    await expect(page.getByRole("link", { name: "Uredi" })).toHaveCount(0);

    await expect(page.locator('meta[property="og:title"]')).toHaveAttribute(
      "content",
      "Hutba za petak",
    );
    await expect(page.locator('meta[property="og:description"]')).toHaveAttribute(
      "content",
      /Prvi pasus|Drugi pasus/,
    );
    await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
      "content",
      /\/(slike|favicon)/,
    );

    const jsonLd = await page.locator('script[type="application/ld+json"]').textContent();
    expect(jsonLd).toBeTruthy();

    const parsed = JSON.parse(jsonLd!) as { "@type": string; headline: string };
    expect(parsed["@type"]).toBe("Article");
    expect(parsed.headline).toBe("Hutba za petak");
  });

  test("robots.txt and sitemap.xml respond correctly", async ({ request }) => {
    const robots = await request.get("/robots.txt");
    expect(robots.ok()).toBe(true);
    expect(await robots.text()).toContain("Sitemap:");

    const sitemap = await request.get("/sitemap.xml");
    expect(sitemap.ok()).toBe(true);
    expect(await sitemap.text()).toContain("/objave/petak-hutba");
  });
});
