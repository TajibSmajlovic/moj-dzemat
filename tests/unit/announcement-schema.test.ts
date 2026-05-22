import { describe, expect, it } from "vitest";

import { AnnouncementFormSchema } from "#app/features/announcements/announcement-schema";

describe("AnnouncementFormSchema", () => {
  it("accepts a valid announcement and trims the message", () => {
    const result = AnnouncementFormSchema.safeParse({
      message: "  Džuma namaz u 13:00  ",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({
        message: "Džuma namaz u 13:00",
        isActive: false,
      });
    }
  });

  it("treats the browser checkbox value as active", () => {
    const result = AnnouncementFormSchema.safeParse({
      message: "Džuma namaz u 13:00",
      isActive: "on",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.isActive).toBe(true);
    }
  });

  it("rejects missing, too-short, and overly-long messages", () => {
    expect(AnnouncementFormSchema.safeParse({}).success).toBe(false);
    expect(AnnouncementFormSchema.safeParse({ message: "ab" }).success).toBe(false);
    expect(AnnouncementFormSchema.safeParse({ message: "x".repeat(501) }).success).toBe(false);
  });

  it("rejects non-browser checkbox values instead of silently coercing them", () => {
    expect(
      AnnouncementFormSchema.safeParse({
        message: "Džuma namaz u 13:00",
        isActive: "off",
      }).success,
    ).toBe(false);
    expect(
      AnnouncementFormSchema.safeParse({
        message: "Džuma namaz u 13:00",
        isActive: true,
      }).success,
    ).toBe(false);
  });
});
