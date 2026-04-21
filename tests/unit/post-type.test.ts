import { describe, expect, it } from "vitest";

import {
  POST_TYPES,
  POST_TYPE_ICON,
  POST_TYPE_LABEL,
  POST_TYPE_LABEL_PLURAL,
  isPostType,
} from "#app/lib/post-type";

describe("post-type", () => {
  it("keeps POST_TYPES aligned with the schema enum order", () => {
    expect([...POST_TYPES]).toEqual(["obavijest", "smrtovnica", "sergija", "hutba"]);
  });

  it("labels every known type in both singular and plural forms", () => {
    for (const type of POST_TYPES) {
      expect(POST_TYPE_LABEL[type]).toBeDefined();
      expect(POST_TYPE_LABEL_PLURAL[type]).toBeDefined();
    }
  });

  it("ships an icon for every known type", () => {
    for (const type of POST_TYPES) {
      expect(POST_TYPE_ICON[type]).toBeDefined();
      // Lucide icons are React components (functions or forwardRef objects).
      const icon = POST_TYPE_ICON[type] as unknown;
      expect(typeof icon === "function" || typeof icon === "object").toBe(true);
    }
  });

  describe("isPostType", () => {
    it("narrows valid strings to PostTypeValue", () => {
      expect(isPostType("hutba")).toBe(true);
      expect(isPostType("obavijest")).toBe(true);
      expect(isPostType("smrtovnica")).toBe(true);
      expect(isPostType("sergija")).toBe(true);
    });

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
