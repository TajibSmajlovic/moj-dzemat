import { describe, expect, it } from "vitest";

import { absoluteUrl } from "#app/lib/routes";
import {
  DEFAULT_SOCIAL_IMAGE,
  ROBOTS_MAX_IMAGE_PREVIEW_LARGE,
  ROBOTS_NOINDEX,
  ROBOTS_NOINDEX_FOLLOW,
  ROBOTS_NOINDEX_NOFOLLOW,
  THEME_COLOR,
  buildBreadcrumbListJsonLd,
  buildNoindexMeta,
  buildPublicPageMeta,
  buildSocialMeta,
  formatDefaultSocialImageAlt,
  getDefaultSocialImageUrl,
  jsonLdScriptContent,
} from "#app/lib/seo";

describe("seo helpers", () => {
  it("builds absolute URLs against the configured site URL", () => {
    expect(absoluteUrl("https://example.test", "/social-card-default.jpg")).toBe(
      "https://example.test/social-card-default.jpg",
    );
    expect(absoluteUrl("https://example.test/", "social-card-default.jpg")).toBe(
      "https://example.test/social-card-default.jpg",
    );
    expect(absoluteUrl(undefined, "/social-card-default.jpg")).toBe("/social-card-default.jpg");
  });

  it("describes the default social image dimensions", () => {
    expect(DEFAULT_SOCIAL_IMAGE).toMatchObject({
      path: "/social-card-default.jpg",
      width: 1200,
      height: 630,
    });
    expect(getDefaultSocialImageUrl("https://example.test")).toBe(
      "https://example.test/social-card-default.jpg",
    );
  });

  it("formats default social image alt text", () => {
    expect(formatDefaultSocialImageAlt("Moj Džemat - Donje Mostre")).toBe(
      "Moj Džemat - Donje Mostre - nova online platforma za džemat",
    );
  });

  it("builds the shared Open Graph and Twitter card descriptors", () => {
    expect(
      buildSocialMeta({
        title: "Naslov",
        description: "Opis",
        imageUrl: "https://example.test/social.jpg",
        imageAlt: "Opis slike",
      }),
    ).toEqual([
      { property: "og:title", content: "Naslov" },
      { property: "og:description", content: "Opis" },
      { property: "og:image", content: "https://example.test/social.jpg" },
      { property: "og:image:alt", content: "Opis slike" },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Naslov" },
      { name: "twitter:description", content: "Opis" },
      { name: "twitter:image", content: "https://example.test/social.jpg" },
      { name: "twitter:image:alt", content: "Opis slike" },
    ]);
  });

  it("uses default social dimensions when image dimensions are nullable", () => {
    expect(
      buildSocialMeta({
        title: "Naslov",
        description: "Opis",
        imageUrl: "https://example.test/social.jpg",
        imageAlt: "Opis slike",
        imageWidth: null,
        imageHeight: null,
      }),
    ).toEqual([
      { property: "og:title", content: "Naslov" },
      { property: "og:description", content: "Opis" },
      { property: "og:image", content: "https://example.test/social.jpg" },
      { property: "og:image:alt", content: "Opis slike" },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Naslov" },
      { name: "twitter:description", content: "Opis" },
      { name: "twitter:image", content: "https://example.test/social.jpg" },
      { name: "twitter:image:alt", content: "Opis slike" },
    ]);
  });

  it("builds complete public page meta descriptors", () => {
    expect(
      buildPublicPageMeta({
        title: "Objave - Moj Džemat",
        socialTitle: "Objave",
        description: "Sve javne objave džemata na jednom mjestu.",
        canonical: "https://example.test/objave",
        siteName: "Moj Džemat",
        imageUrl: "https://example.test/social.jpg",
        imageAlt: "Opis slike",
        imageWidth: 1600,
        imageHeight: 900,
        ogType: "article",
        robots: ROBOTS_NOINDEX_FOLLOW,
      }),
    ).toEqual([
      { title: "Objave - Moj Džemat" },
      { name: "description", content: "Sve javne objave džemata na jednom mjestu." },
      { property: "og:type", content: "article" },
      { property: "og:site_name", content: "Moj Džemat" },
      { property: "og:locale", content: "bs_BA" },
      { property: "og:url", content: "https://example.test/objave" },
      { property: "og:title", content: "Objave" },
      { property: "og:description", content: "Sve javne objave džemata na jednom mjestu." },
      { property: "og:image", content: "https://example.test/social.jpg" },
      { property: "og:image:alt", content: "Opis slike" },
      { property: "og:image:width", content: "1600" },
      { property: "og:image:height", content: "900" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Objave" },
      { name: "twitter:description", content: "Sve javne objave džemata na jednom mjestu." },
      { name: "twitter:image", content: "https://example.test/social.jpg" },
      { name: "twitter:image:alt", content: "Opis slike" },
      { name: "theme-color", content: THEME_COLOR },
      { tagName: "link", rel: "canonical", href: "https://example.test/objave" },
      { name: "robots", content: ROBOTS_NOINDEX_FOLLOW },
    ]);
  });

  it("builds noindex meta descriptors", () => {
    expect(buildNoindexMeta("Prijava")).toEqual([
      { title: "Prijava" },
      { name: "robots", content: ROBOTS_NOINDEX },
    ]);

    expect(buildNoindexMeta("Admin", ROBOTS_NOINDEX_NOFOLLOW)).toEqual([
      { title: "Admin" },
      { name: "robots", content: ROBOTS_NOINDEX_NOFOLLOW },
    ]);
  });

  it("builds BreadcrumbList JSON-LD from ordered page items", () => {
    expect(
      buildBreadcrumbListJsonLd([
        { name: "Početna", url: "https://example.test/" },
        { name: "Objave", url: "https://example.test/objave" },
      ]),
    ).toEqual({
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "Početna",
          item: "https://example.test/",
        },
        {
          "@type": "ListItem",
          position: 2,
          name: "Objave",
          item: "https://example.test/objave",
        },
      ],
    });
  });

  it("keeps robots directives in one place", () => {
    expect(ROBOTS_MAX_IMAGE_PREVIEW_LARGE).toBe("max-image-preview:large");
    expect(ROBOTS_NOINDEX).toBe("noindex");
    expect(ROBOTS_NOINDEX_FOLLOW).toBe("noindex,follow");
    expect(ROBOTS_NOINDEX_NOFOLLOW).toBe("noindex,nofollow");
  });

  it("escapes JSON-LD closing script sequences", () => {
    expect(jsonLdScriptContent({ name: "</script>" })).toContain(String.raw`<\/script>`);
  });
});
