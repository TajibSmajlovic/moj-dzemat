import { describe, expect, it } from "vitest";

import { POST_TYPES, POST_TYPE_ICON, formatPostArchiveTitle, isPostType } from "#app/lib/post-type";

describe("post-type", () => {
  it("keeps POST_TYPES aligned with the schema enum order", () => {
    expect([...POST_TYPES]).toEqual(["obavijest", "hutba", "sergija", "smrtovnica"]);
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
