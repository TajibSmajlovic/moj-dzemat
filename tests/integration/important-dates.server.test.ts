import { describe, expect, it } from "vitest";

import { getUpcomingImportantDates } from "#app/features/important-dates/important-dates.server";
import { dateToYmd, ymdToUtcDate } from "#app/lib/date";

import { createImportantDate } from "../factories";

const TODAY_YMD = "2026-06-01";
const QUERY = { todayYmd: TODAY_YMD };

function ymdFromToday(offsetDays: number): string {
  const today = ymdToUtcDate(TODAY_YMD);
  if (!today) throw new Error("TODAY_YMD must be valid");

  const shifted = new Date(today);
  shifted.setUTCDate(shifted.getUTCDate() + offsetDays);

  return dateToYmd(shifted);
}

describe("getUpcomingImportantDates", () => {
  it("shows an upcoming date", async () => {
    await createImportantDate({ title: "Nadolazeći", date: ymdFromToday(5) });

    const result = await getUpcomingImportantDates(QUERY);

    expect(result.map((row) => row.title)).toEqual(["Nadolazeći"]);
  });

  it("hides a past date", async () => {
    await createImportantDate({ title: "Prošli", date: ymdFromToday(-5) });

    const result = await getUpcomingImportantDates(QUERY);

    expect(result).toEqual([]);
  });

  it("includes today", async () => {
    await createImportantDate({ title: "Danas", date: TODAY_YMD });

    const result = await getUpcomingImportantDates(QUERY);

    expect(result.map((row) => row.title)).toEqual(["Danas"]);
  });

  it("hides a one-time date from the next calendar year", async () => {
    await createImportantDate({ title: "Naredna godina", date: "2027-01-01" });

    const result = await getUpcomingImportantDates(QUERY);

    expect(result).toEqual([]);
  });

  it("projects an annual date from an earlier year onto the current year", async () => {
    await createImportantDate({
      title: "Sjećanje na genocid u Srebrenici",
      date: "2024-07-11",
      recursYearly: true,
    });

    const result = await getUpcomingImportantDates(QUERY);

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ title: "Sjećanje na genocid u Srebrenici" });
    expect(result[0]?.date.toISOString()).toBe("2026-07-11T00:00:00.000Z");
  });

  it("hides this year's occurrence after it has passed", async () => {
    await createImportantDate({
      title: "Godišnjica u maju",
      date: "2024-05-31",
      recursYearly: true,
    });

    const result = await getUpcomingImportantDates(QUERY);

    expect(result).toEqual([]);
  });

  it("does not project an annual date before its source year", async () => {
    await createImportantDate({
      title: "Ponavljanje počinje naredne godine",
      date: "2027-07-11",
      recursYearly: true,
    });

    const result = await getUpcomingImportantDates(QUERY);

    expect(result).toEqual([]);
  });

  it("skips a February 29 occurrence in a non-leap year", async () => {
    await createImportantDate({
      title: "Prijestupni datum",
      date: "2024-02-29",
      recursYearly: true,
    });

    const result = await getUpcomingImportantDates({ todayYmd: "2026-01-01" });

    expect(result).toEqual([]);
  });

  it("orders one-time and projected annual dates chronologically", async () => {
    await createImportantDate({ title: "Plus 10", date: ymdFromToday(10) });
    await createImportantDate({
      title: "Godišnji plus 1",
      date: "2024-06-02",
      recursYearly: true,
    });
    await createImportantDate({ title: "Plus 5", date: ymdFromToday(5) });

    const result = await getUpcomingImportantDates(QUERY);

    expect(result.map((row) => row.title)).toEqual(["Godišnji plus 1", "Plus 5", "Plus 10"]);
  });

  it("returns all upcoming dates", async () => {
    for (let i = 1; i <= 7; i += 1) {
      await createImportantDate({ title: `Datum ${i}`, date: ymdFromToday(i) });
    }

    const result = await getUpcomingImportantDates(QUERY);

    expect(result).toHaveLength(7);
    expect(result.map((row) => row.title)).toEqual([
      "Datum 1",
      "Datum 2",
      "Datum 3",
      "Datum 4",
      "Datum 5",
      "Datum 6",
      "Datum 7",
    ]);
  });

  it("returns an empty array when there are no upcoming dates", async () => {
    await createImportantDate({ title: "Samo prošli", date: ymdFromToday(-1) });

    const result = await getUpcomingImportantDates(QUERY);

    expect(result).toEqual([]);
  });
});
