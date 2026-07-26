import { describe, expect, it } from "vitest";

import {
  POST_TYPES,
  POST_TYPE_ICON,
  formatLatestPostsTitle,
  formatPostArchiveTitle,
  isPostType,
} from "#app/features/posts/post-type";

describe("post-type", () => {
  it("keeps POST_TYPES aligned with the schema enum order", () => {
    expect([...POST_TYPES]).toEqual(["obavijest", "hutba", "sergija", "price", "smrtovnica"]);
  });

  it("ships an icon for every known type", () => {
    for (const type of POST_TYPES) {
      expect(POST_TYPE_ICON[type]).toBeDefined();
      // Lucide icons are React components (functions or forwardRef objects).
      const icon = POST_TYPE_ICON[type] as unknown;
      expect(typeof icon === "function" || typeof icon === "object").toBe(true);
    }
  });

  describe("formatPostArchiveTitle", () => {
    it("uses the generic archive title for all posts", () => {
      expect(formatPostArchiveTitle("all")).toBe("Sve objave");
    });

    it("uses the selected type plural in the archive title", () => {
      expect(formatPostArchiveTitle("obavijest")).toBe("Sve obavijesti");
      expect(formatPostArchiveTitle("hutba")).toBe("Sve hutbe");
      expect(formatPostArchiveTitle("sergija")).toBe("Sve sergije");
      expect(formatPostArchiveTitle("smrtovnica")).toBe("Sve smrtovnice");
      expect(formatPostArchiveTitle("price")).toBe("Sve priče");
    });
  });

  describe("formatLatestPostsTitle", () => {
    it("uses the generic latest title for all posts", () => {
      expect(formatLatestPostsTitle("all")).toBe("Najnovije objave");
    });

    it("uses the selected type plural in the latest title", () => {
      expect(formatLatestPostsTitle("obavijest")).toBe("Najnovije obavijesti");
      expect(formatLatestPostsTitle("hutba")).toBe("Najnovije hutbe");
      expect(formatLatestPostsTitle("sergija")).toBe("Najnovije sergije");
      expect(formatLatestPostsTitle("smrtovnica")).toBe("Najnovije smrtovnice");
      expect(formatLatestPostsTitle("price")).toBe("Najnovije priče");
    });
  });

  describe("isPostType", () => {
    it("rejects unknown strings", () => {
      expect(isPostType("nonsense")).toBe(false);
      expect(isPostType("")).toBe(false);
    });

    it("is case-sensitive (DB enum uses lowercase only)", () => {
      expect(isPostType("Hutba")).toBe(false);
      expect(isPostType("HUTBA")).toBe(false);
    });

    it("rejects non-string inputs", () => {
      expect(isPostType(undefined)).toBe(false);
      expect(isPostType(null)).toBe(false);
      expect(isPostType(0)).toBe(false);
      expect(isPostType({})).toBe(false);
      expect(isPostType([])).toBe(false);
      expect(isPostType(Symbol("hutba"))).toBe(false);
    });
  });
});
