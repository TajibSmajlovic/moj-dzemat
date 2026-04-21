import { describe, expect, it } from "vitest";

import { formatDateLong, formatDateShort, toIsoDate } from "#app/lib/date";

describe("toIsoDate", () => {
  it("round-trips a Date through ISO", () => {
    const d = new Date("2026-04-17T10:00:00Z");
    expect(toIsoDate(d)).toBe("2026-04-17T10:00:00.000Z");
  });

  it("accepts strings and numbers", () => {
    expect(toIsoDate("2026-04-17")).toMatch(/^2026-04-17/);
    expect(toIsoDate(0)).toBe("1970-01-01T00:00:00.000Z");
  });
});

describe("formatDateLong", () => {
  it("uses long Bosnian month names", () => {
    expect(formatDateLong("2026-01-15T12:00:00Z")).toBe("15. januar 2026.");
    expect(formatDateLong("2026-02-15T12:00:00Z")).toBe("15. februar 2026.");
    expect(formatDateLong("2026-03-15T12:00:00Z")).toBe("15. mart 2026.");
    expect(formatDateLong("2026-04-15T12:00:00Z")).toBe("15. april 2026.");
    expect(formatDateLong("2026-05-15T12:00:00Z")).toBe("15. maj 2026.");
    expect(formatDateLong("2026-06-15T12:00:00Z")).toBe("15. jun 2026.");
    expect(formatDateLong("2026-07-15T12:00:00Z")).toBe("15. jul 2026.");
    expect(formatDateLong("2026-08-15T12:00:00Z")).toBe("15. august 2026.");
    expect(formatDateLong("2026-09-15T12:00:00Z")).toBe("15. septembar 2026.");
    expect(formatDateLong("2026-10-15T12:00:00Z")).toBe("15. oktobar 2026.");
    expect(formatDateLong("2026-11-15T12:00:00Z")).toBe("15. novembar 2026.");
    expect(formatDateLong("2026-12-15T12:00:00Z")).toBe("15. decembar 2026.");
  });

  it("formats the date in Europe/Sarajevo, rolling over to the next day when UTC is late evening", () => {
    // 22:30 UTC on April 17 = 00:30 on April 18 in Sarajevo (CEST = UTC+2)
    expect(formatDateLong("2026-04-17T22:30:00Z")).toBe("18. april 2026.");
  });

  it("handles the spring DST transition (last Sunday of March)", () => {
    // 00:30 UTC = 01:30 CET, still March 29
    expect(formatDateLong("2026-03-29T00:30:00Z")).toBe("29. mart 2026.");
    // 02:30 UTC = 04:30 CEST, still March 29
    expect(formatDateLong("2026-03-29T02:30:00Z")).toBe("29. mart 2026.");
  });

  it("handles the autumn DST transition (last Sunday of October)", () => {
    // After fall-back, 22:30 UTC on Oct 31 = 23:30 CET (Oct 31)
    expect(formatDateLong("2026-10-31T22:30:00Z")).toBe("31. oktobar 2026.");
    // 23:30 UTC = 00:30 CET on Nov 1
    expect(formatDateLong("2026-10-31T23:30:00Z")).toBe("1. novembar 2026.");
  });

  it("returns an empty string for invalid input", () => {
    expect(formatDateLong("not-a-date")).toBe("");
    expect(formatDateLong(Number.NaN)).toBe("");
  });

  it("accepts string and number inputs", () => {
    expect(formatDateLong("2026-04-17")).toBe("17. april 2026.");
    expect(formatDateLong(new Date("2026-06-01T10:00:00Z").getTime())).toBe("1. jun 2026.");
  });
});

describe("formatDateShort", () => {
  it("zero-pads day and month", () => {
    expect(formatDateShort("2026-04-07T12:00:00Z")).toBe("07.04.2026");
    expect(formatDateShort("2026-01-01T12:00:00Z")).toBe("01.01.2026");
    expect(formatDateShort("2026-12-31T12:00:00Z")).toBe("31.12.2026");
  });

  it("rolls over to the next day in the site timezone", () => {
    // 22:30 UTC on June 15 = 00:30 on June 16 in Sarajevo (CEST = UTC+2)
    expect(formatDateShort("2026-06-15T22:30:00Z")).toBe("16.06.2026");
  });

  it("returns an empty string for invalid input", () => {
    expect(formatDateShort("nope")).toBe("");
    expect(formatDateShort(Number.NaN)).toBe("");
  });
});
