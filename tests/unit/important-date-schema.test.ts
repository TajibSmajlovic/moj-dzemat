import { describe, expect, it } from "vitest";

import { ImportantDateFormSchema } from "#app/features/important-dates/important-date-schema";

describe("ImportantDateFormSchema", () => {
  it("accepts a valid entry, trims the title, and keeps the description", () => {
    const result = ImportantDateFormSchema.safeParse({
      title: "  Bajram namaz  ",
      date: "2026-06-16",
      description: "  Klanja se u 06:00.  ",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({
        title: "Bajram namaz",
        date: "2026-06-16",
        description: "Klanja se u 06:00.",
      });
    }
  });

  it("maps an empty or whitespace-only description to null", () => {
    const empty = ImportantDateFormSchema.safeParse({
      title: "Bajram namaz",
      date: "2026-06-16",
      description: "   ",
    });
    expect(empty.success).toBe(true);
    if (empty.success) {
      expect(empty.data.description).toBeNull();
    }

    const omitted = ImportantDateFormSchema.safeParse({
      title: "Bajram namaz",
      date: "2026-06-16",
    });
    expect(omitted.success).toBe(true);
    if (omitted.success) {
      expect(omitted.data.description).toBeNull();
    }
  });

  it("rejects missing, too-short, and overly-long titles", () => {
    expect(ImportantDateFormSchema.safeParse({ date: "2026-06-16" }).success).toBe(false);
    expect(ImportantDateFormSchema.safeParse({ title: "ab", date: "2026-06-16" }).success).toBe(
      false,
    );
    expect(
      ImportantDateFormSchema.safeParse({ title: "x".repeat(121), date: "2026-06-16" }).success,
    ).toBe(false);
  });

  it("rejects a missing or invalid date", () => {
    expect(ImportantDateFormSchema.safeParse({ title: "Bajram namaz" }).success).toBe(false);
    expect(
      ImportantDateFormSchema.safeParse({ title: "Bajram namaz", date: "2026-02-30" }).success,
    ).toBe(false);
    expect(
      ImportantDateFormSchema.safeParse({ title: "Bajram namaz", date: "nije-datum" }).success,
    ).toBe(false);
  });

  it("rejects an overly-long description", () => {
    expect(
      ImportantDateFormSchema.safeParse({
        title: "Bajram namaz",
        date: "2026-06-16",
        description: "x".repeat(301),
      }).success,
    ).toBe(false);
  });
});
