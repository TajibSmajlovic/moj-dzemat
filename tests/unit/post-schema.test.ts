import { describe, expect, it } from "vitest";

import { PostFormSchema } from "#app/lib/post-schema";

describe("PostFormSchema", () => {
  const valid = {
    title: "Prva objava",
    slug: "prva-objava",
    type: "obavijest" as const,
    body: "Tijelo objave.",
  };

  it("accepts a valid payload", () => {
    const result = PostFormSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it("rejects a slug with uppercase letters", () => {
    const result = PostFormSchema.safeParse({ ...valid, slug: "Prva-Objava" });
    expect(result.success).toBe(false);
    if (!result.success) {
      const issue = result.error.issues.find((i) => i.path[0] === "slug");
      expect(issue?.message).toMatch(/mala slova/);
    }
  });

  it("rejects a slug with leading or trailing dashes", () => {
    const badSlugs = ["-hello", "hello-", "foo--bar"];
    for (const slug of badSlugs) {
      expect(PostFormSchema.safeParse({ ...valid, slug }).success).toBe(false);
    }
  });

  it("rejects unknown post types", () => {
    const result = PostFormSchema.safeParse({ ...valid, type: "other" });
    expect(result.success).toBe(false);
  });

  it("rejects overly long titles", () => {
    const result = PostFormSchema.safeParse({
      ...valid,
      title: "x".repeat(201),
    });
    expect(result.success).toBe(false);
  });

  it("does not accept publishedAt — the DB records it on create", () => {
    const result = PostFormSchema.safeParse({
      ...valid,
      publishedAt: "2026-04-17T15:30",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect("publishedAt" in result.data).toBe(false);
    }
  });

  describe("checkbox shim", () => {
    it("defaults to false when the field is omitted", () => {
      const result = PostFormSchema.safeParse(valid);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.publish).toBe(false);
        expect(result.data.featured).toBe(false);
        expect(result.data.pinned).toBe(false);
      }
    });

    it("treats the literal 'on' as true (matching the browser checkbox encoding)", () => {
      const result = PostFormSchema.safeParse({
        ...valid,
        publish: "on",
        featured: "on",
        pinned: "on",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.publish).toBe(true);
        expect(result.data.featured).toBe(true);
        expect(result.data.pinned).toBe(true);
      }
    });

    it("rejects values other than 'on' or undefined", () => {
      // 'off' is not how browsers encode an unchecked box (they omit the field
      // entirely), so accepting it would mask a real submission bug.
      expect(PostFormSchema.safeParse({ ...valid, publish: "off" }).success).toBe(false);
      expect(PostFormSchema.safeParse({ ...valid, featured: "off" }).success).toBe(false);
      expect(PostFormSchema.safeParse({ ...valid, publish: true }).success).toBe(false);
      expect(PostFormSchema.safeParse({ ...valid, featured: true }).success).toBe(false);
      expect(PostFormSchema.safeParse({ ...valid, pinned: false }).success).toBe(false);
      expect(PostFormSchema.safeParse({ ...valid, pinned: 1 }).success).toBe(false);
    });
  });
});
