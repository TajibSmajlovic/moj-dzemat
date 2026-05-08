import { describe, expect, it } from "vitest";

import {
  DEFAULT_SOCIAL_IMAGE,
  ROBOTS_NOINDEX,
  ROBOTS_NOINDEX_FOLLOW,
  ROBOTS_NOINDEX_NOFOLLOW,
  absoluteSiteUrl,
  buildSocialMeta,
  formatDefaultSocialImageAlt,
  getDefaultSocialImageUrl,
  jsonLdScriptContent,
} from "#app/lib/seo";

describe("seo helpers", () => {
  it("builds absolute URLs against the configured site URL", () => {
    expect(absoluteSiteUrl("https://example.test", "/social-card-default.jpg")).toBe(
      "https://example.test/social-card-default.jpg",
    );
    expect(absoluteSiteUrl(undefined, "/social-card-default.jpg")).toBe("/social-card-default.jpg");
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
      "Moj Džemat - Donje Mostre - nova online platforma za dzemat",
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

  it("keeps robots directives in one place", () => {
    expect(ROBOTS_NOINDEX).toBe("noindex");
    expect(ROBOTS_NOINDEX_FOLLOW).toBe("noindex,follow");
    expect(ROBOTS_NOINDEX_NOFOLLOW).toBe("noindex,nofollow");
  });

  it("escapes JSON-LD closing script sequences", () => {
    expect(jsonLdScriptContent({ name: "</script>" })).toContain(String.raw`<\/script>`);
  });
});
