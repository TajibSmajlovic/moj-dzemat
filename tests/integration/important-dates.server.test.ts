import { describe, expect, it } from "vitest";

import { getUpcomingImportantDates } from "#app/features/important-dates/important-dates.server";
import { dateToYmd, getTodayYmd, ymdToUtcDate } from "#app/lib/date";

import { createImportantDate } from "../factories";

// today + offsetDays as a "YYYY-MM-DD" string (UTC calendar math).
function ymdFromToday(offsetDays: number): string {
  const today = ymdToUtcDate(getTodayYmd());
  if (!today) throw new Error("getTodayYmd() did not produce a valid YMD");

  const shifted = new Date(today);
  shifted.setUTCDate(shifted.getUTCDate() + offsetDays);

  return dateToYmd(shifted);
}

describe("getUpcomingImportantDates", () => {
  it("shows an upcoming date", async () => {
    await createImportantDate({ title: "Nadolazeći", date: ymdFromToday(5) });

    const result = await getUpcomingImportantDates();

    expect(result.map((row) => row.title)).toEqual(["Nadolazeći"]);
  });

  it("hides a past date", async () => {
    await createImportantDate({ title: "Prošli", date: ymdFromToday(-5) });

    const result = await getUpcomingImportantDates();

    expect(result).toEqual([]);
  });

  it("includes today (upcoming is >= today)", async () => {
    await createImportantDate({ title: "Danas", date: ymdFromToday(0) });

    const result = await getUpcomingImportantDates();

    expect(result.map((row) => row.title)).toEqual(["Danas"]);
  });

  it("orders chronologically", async () => {
    await createImportantDate({ title: "Plus 10", date: ymdFromToday(10) });
    await createImportantDate({ title: "Plus 1", date: ymdFromToday(1) });
    await createImportantDate({ title: "Plus 5", date: ymdFromToday(5) });

    const result = await getUpcomingImportantDates();

    expect(result.map((row) => row.title)).toEqual(["Plus 1", "Plus 5", "Plus 10"]);
  });

  it("returns all upcoming dates", async () => {
    for (let i = 1; i <= 7; i += 1) {
      await createImportantDate({ title: `Datum ${i}`, date: ymdFromToday(i) });
    }

    const result = await getUpcomingImportantDates();

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

    const result = await getUpcomingImportantDates();

    expect(result).toEqual([]);
  });
});
