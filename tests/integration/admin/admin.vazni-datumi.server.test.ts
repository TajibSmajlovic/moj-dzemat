import { href } from "react-router";

import { beforeEach, describe, expect, it } from "vitest";

import { dateToYmd, getTodayYmd, ymdToUtcDate } from "#app/lib/date";
import {
  action as importantDatesAction,
  loader as importantDatesLoader,
} from "#app/routes/admin.vazni-datumi";
import { prisma } from "#app/server/db.server";

import { createImportantDate } from "../../factories";
import { expectData, payloadOf, statusOf } from "../../helpers/action-result";
import { createAdminSession, type AdminRouteContext } from "../../helpers/auth";
import { withHoneypot } from "../../helpers/honeypot";
import { callAction as runAction, callLoader as runLoader, testUrl } from "../../helpers/route";

const ENDPOINT = testUrl(href("/admin/vazni-datumi"));

const callAction = (formData: FormData, context: AdminRouteContext) =>
  runAction(importantDatesAction, { url: ENDPOINT, formData, context });

const callLoader = (context: AdminRouteContext) =>
  runLoader(importantDatesLoader, { url: ENDPOINT, context });

// today + offsetDays as a "YYYY-MM-DD" string (UTC calendar math).
function ymdFromToday(offsetDays: number): string {
  const today = ymdToUtcDate(getTodayYmd());
  if (!today) throw new Error("getTodayYmd() did not produce a valid YMD");

  const shifted = new Date(today);
  shifted.setUTCDate(shifted.getUTCDate() + offsetDays);

  return dateToYmd(shifted);
}

type ConformReply = {
  result: { error: Record<string, string[] | undefined> };
};

describe("admin important dates route", () => {
  let context: AdminRouteContext;

  beforeEach(async () => {
    ({ context } = await createAdminSession());
  });

  it("returns upcoming dates first (nearest first), then past dates (most recent first)", async () => {
    await createImportantDate({ title: "Plus 5", date: ymdFromToday(5) });
    await createImportantDate({ title: "Plus 1", date: ymdFromToday(1) });
    await createImportantDate({ title: "Minus 3", date: ymdFromToday(-3) });
    await createImportantDate({ title: "Minus 10", date: ymdFromToday(-10) });

    const result = expectData(await callLoader(context));

    expect(result.importantDates.map((row) => row.title)).toEqual([
      "Plus 1",
      "Plus 5",
      "Minus 3",
      "Minus 10",
    ]);
  });

  it("inserts a row and redirects", async () => {
    const formData = new FormData();
    formData.set("intent", "create");
    formData.set("title", "Bajram namaz");
    formData.set("date", "2026-06-16");
    formData.set("description", "Klanja se u 06:00.");
    withHoneypot(formData);

    const result = await callAction(formData, context);
    expect(result).toBeInstanceOf(Response);
    expect((result as Response).status).toBe(302);

    const inserted = await prisma.importantDate.findFirst({
      where: { title: "Bajram namaz" },
    });
    expect(inserted?.description).toBe("Klanja se u 06:00.");
    expect(inserted?.date.toISOString()).toBe("2026-06-16T00:00:00.000Z");
  });

  it("returns 400 with a field error when the date is invalid", async () => {
    const formData = new FormData();
    formData.set("intent", "create");
    formData.set("title", "Neispravan datum");
    formData.set("date", "2026-02-30");
    withHoneypot(formData);

    const result = await callAction(formData, context);

    expect(statusOf(result)).toBe(400);
    const body = payloadOf<ConformReply>(result);
    expect(body.result.error.date?.[0]).toMatch(/ispravan datum/i);
  });

  it("returns 400 with a field error when the title is missing", async () => {
    const formData = new FormData();
    formData.set("intent", "create");
    formData.set("title", "   ");
    formData.set("date", "2026-06-16");
    withHoneypot(formData);

    const result = await callAction(formData, context);

    expect(statusOf(result)).toBe(400);
    const body = payloadOf<ConformReply>(result);
    expect(body.result.error.title?.[0]).toMatch(/obavezan/i);
  });

  it("changes the title, date, and description of an existing row", async () => {
    const existing = await createImportantDate({
      title: "Stari naslov",
      date: "2026-06-16",
      description: "Stari opis.",
    });

    const formData = new FormData();
    formData.set("intent", "update");
    formData.set("id", existing.id);
    formData.set("title", "Novi naslov");
    formData.set("date", "2026-07-20");
    formData.set("description", "Novi opis.");
    withHoneypot(formData);

    const result = await callAction(formData, context);
    expect((result as Response).status).toBe(302);

    const updated = await prisma.importantDate.findUnique({ where: { id: existing.id } });
    expect(updated).toMatchObject({ title: "Novi naslov", description: "Novi opis." });
    expect(updated?.date.toISOString()).toBe("2026-07-20T00:00:00.000Z");
  });

  it("removes the target row and leaves the rest untouched", async () => {
    const keeper = await createImportantDate({ title: "Ostaje", date: "2026-06-16" });
    const victim = await createImportantDate({ title: "Briše se", date: "2026-07-01" });

    const formData = new FormData();
    formData.set("intent", "delete");
    formData.set("id", victim.id);
    withHoneypot(formData);

    await callAction(formData, context);

    expect(await prisma.importantDate.findUnique({ where: { id: victim.id } })).toBeNull();
    expect(await prisma.importantDate.findUnique({ where: { id: keeper.id } })).not.toBeNull();
  });
});
