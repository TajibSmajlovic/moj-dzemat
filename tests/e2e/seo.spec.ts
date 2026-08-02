import { href } from "react-router";

import { expect, test, type Page } from "@playwright/test";

import { postHref } from "../../app/features/posts/post-routes";
import { POSTS_TITLES } from "./fixtures/seed-data";

type JsonLdObject = {
  "@type"?: string;
  "@id"?: string;
  "@graph"?: JsonLdObject[];
  address?: unknown;
  articleSection?: string;
  author?: unknown;
  dateModified?: string;
  datePublished?: string;
  description?: string;
  headline?: string;
  image?: unknown;
  inLanguage?: string;
  itemListElement?: unknown;
  location?: unknown;
  mainEntityOfPage?: unknown;
  name?: string;
  parentOrganization?: unknown;
  publisher?: unknown;
  sameAs?: string[];
  url?: string;
};

async function expectUniqueSharedMeta(page: Page) {
  await expect(page.locator('meta[property="og:title"]')).toHaveCount(1);
  await expect(page.locator('meta[property="og:description"]')).toHaveCount(1);
  await expect(page.locator('meta[property="og:image"]')).toHaveCount(1);
  await expect(page.locator('link[rel="canonical"]')).toHaveCount(1);
}

async function getJsonLdObjects(page: Page): Promise<JsonLdObject[]> {
  const scriptContents = await page.locator('script[type="application/ld+json"]').allTextContents();

  return scriptContents.map((content) => JSON.parse(content) as JsonLdObject);
}

function findJsonLdObject(objects: JsonLdObject[], type: string): JsonLdObject | undefined {
  return objects.find((object) => object["@type"] === type);
}

test.describe("seo", () => {
  test("homepage exposes canonical metadata, social image and structured data", async ({
    page,
  }) => {
    await page.goto(href("/"));

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
    await expect(page.locator('meta[name="theme-color"][content="#1a4737"]')).toHaveCount(1);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
      "content",
      "max-image-preview:large",
    );

    // Each shared meta key must appear exactly once. Guards against the
    // class of regression where a route file emits an entry that
    // `buildSocialMeta` also produces (React Router doesn't dedupe).
    await expectUniqueSharedMeta(page);

    // eslint-disable-next-line unicorn/no-await-expression-member
    const parsed = (await getJsonLdObjects(page)).find((object) => Array.isArray(object["@graph"]));
    const graph = parsed?.["@graph"] ?? [];
    const organization = graph.find((entry) => entry["@type"] === "Organization");
    const mosque = graph.find((entry) => entry["@type"] === "Mosque");

    expect(parsed).toBeTruthy();
    expect(graph.map((entry) => entry["@type"])).toEqual(["Organization", "Mosque"]);
    expect(organization).toMatchObject({
      "@id": "http://localhost:3000/#organization",
      name: "Moj Džemat - Donje Mostre",
      url: "http://localhost:3000",
      description:
        "Zvanična stranica džemata Donje Mostre za aktuelne obavijesti, hutbe, sergije, smrtovnice i priče.",
      address: {
        "@type": "PostalAddress",
        streetAddress: "Džamija Donje Moštre, R445, Donje Moštre, Visoko, Bosna i Hercegovina",
        addressCountry: "BA",
      },
      location: {
        "@id": "http://localhost:3000/#place",
      },
      parentOrganization: {
        "@type": "Organization",
        name: "Medžlis Islamske zajednice Visoko",
        url: "https://muftijstvosarajevsko.ba/medzlis-islamske-zajednice-visoko/",
        parentOrganization: {
          "@type": "Organization",
          name: "Muftijstvo sarajevsko",
          url: "https://muftijstvosarajevsko.ba/",
          parentOrganization: {
            "@type": "Organization",
            name: "Rijaset Islamske zajednice u Bosni i Hercegovini",
            url: "https://islamskazajednica.ba/",
          },
        },
      },
      sameAs: [
        "https://www.facebook.com/profile.php?id=100085095166223",
        "https://www.youtube.com/@DzematDonjeMostre",
      ],
    });
    expect(mosque).toMatchObject({
      "@id": "http://localhost:3000/#place",
      name: "Moj Džemat - Donje Mostre",
      url: "http://localhost:3000",
      description:
        "Zvanična stranica džemata Donje Mostre za aktuelne obavijesti, hutbe, sergije, smrtovnice i priče.",
      address: {
        "@type": "PostalAddress",
        streetAddress: "Džamija Donje Moštre, R445, Donje Moštre, Visoko, Bosna i Hercegovina",
        addressCountry: "BA",
      },
      publicAccess: true,
      parentOrganization: {
        "@id": "http://localhost:3000/#organization",
      },
    });
  });

  test("filtered homepage canonicalizes back to the main listing", async ({ page }) => {
    await page.goto(`${href("/")}?vrsta=hutba`);

    await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
      "content",
      "noindex,follow,max-image-preview:large",
    );
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      "href",
      "http://localhost:3000/",
    );
  });

  test("archive exposes canonical metadata without duplicate shared tags", async ({ page }) => {
    await page.goto(href("/objave"));

    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      "href",
      "http://localhost:3000/objave",
    );
    await expect(page.locator('meta[property="og:title"]')).toHaveAttribute("content", /Objave/);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
      "content",
      "max-image-preview:large",
    );
    await expectUniqueSharedMeta(page);

    const jsonLdObjects = await getJsonLdObjects(page);
    expect(findJsonLdObject(jsonLdObjects, "BreadcrumbList")?.itemListElement).toEqual([
      {
        "@type": "ListItem",
        position: 1,
        name: "Početna",
        item: "http://localhost:3000/",
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Objave",
        item: "http://localhost:3000/objave",
      },
    ]);
  });

  test("filtered archive is noindexed and canonicalizes to the archive", async ({ page }) => {
    await page.goto(`${href("/objave")}?vrsta=hutba`);

    await expect(page.getByRole("heading", { name: "Sve hutbe" })).toBeVisible();
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
      "content",
      "noindex,follow,max-image-preview:large",
    );
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      "href",
      "http://localhost:3000/objave",
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
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
      "content",
      "max-image-preview:large",
    );

    // Same duplicate-key guard as the homepage test — this is the page
    // that hit the dupe-meta bug (route file listed og:title/og:description
    // standalone alongside the buildSocialMeta spread).
    await expectUniqueSharedMeta(page);

    const jsonLdObjects = await getJsonLdObjects(page);
    const article = findJsonLdObject(jsonLdObjects, "Article");

    expect(article).toMatchObject({
      "@type": "Article",
      "@id": `http://localhost:3000${postHref("e2e-objava-1")}#article`,
      url: `http://localhost:3000${postHref("e2e-objava-1")}`,
      headline: POSTS_TITLES[0],
      description: expect.stringContaining("Drugi paragraf."),
      inLanguage: "bs-BA",
      articleSection: "Obavijest",
      mainEntityOfPage: {
        "@type": "WebPage",
        "@id": `http://localhost:3000${postHref("e2e-objava-1")}`,
      },
      author: {
        "@type": "Organization",
        "@id": "http://localhost:3000/#organization",
        name: "Moj Džemat - Donje Mostre",
        url: "http://localhost:3000",
      },
      publisher: {
        "@id": "http://localhost:3000/#organization",
      },
    });
    expect(findJsonLdObject(jsonLdObjects, "BreadcrumbList")?.itemListElement).toEqual([
      {
        "@type": "ListItem",
        position: 1,
        name: "Početna",
        item: "http://localhost:3000/",
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Objave",
        item: "http://localhost:3000/objave",
      },
      {
        "@type": "ListItem",
        position: 3,
        name: POSTS_TITLES[0],
        item: `http://localhost:3000${postHref("e2e-objava-1")}`,
      },
    ]);
  });

  test("robots.txt and sitemap.xml respond correctly", async ({ request }) => {
    const robots = await request.get(href("/robots.txt"));
    expect(robots.ok()).toBe(true);
    expect(await robots.text()).toContain("Sitemap:");

    const sitemap = await request.get(href("/sitemap.xml"));
    expect(sitemap.ok()).toBe(true);
    expect(await sitemap.text()).toContain(postHref("e2e-objava-1"));
  });
});
