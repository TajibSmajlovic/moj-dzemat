import type { Prisma } from "@prisma/client";

import { getTodayYmd, ymdToUtcDate } from "#app/lib/date";
import { invariant } from "#app/lib/invariant";
import { prisma } from "#app/server/db.server";

export type PublicImportantDate = {
  id: string;
  title: string;
  date: Date; // UTC midnight; convert with dateToYmd() before display
  description: string | null;
};

export type AdminImportantDateRow = PublicImportantDate & {
  createdAt: Date;
};

const publicSelect = {
  id: true,
  title: true,
  date: true,
  description: true,
} satisfies Prisma.ImportantDateSelect;

const adminSelect = {
  ...publicSelect,
  createdAt: true,
} satisfies Prisma.ImportantDateSelect;

// Upcoming = date >= today (site timezone), compared at UTC midnight.
export async function getUpcomingImportantDates(): Promise<PublicImportantDate[]> {
  const todayUtc = ymdToUtcDate(getTodayYmd());
  invariant(todayUtc, "getTodayYmd() must produce a valid YMD");

  return prisma.importantDate.findMany({
    where: { date: { gte: todayUtc } },
    orderBy: [{ date: "asc" }, { createdAt: "asc" }],
    select: publicSelect,
  });
}

/**
   Admin sees ALL rows. Upcoming dates come first (nearest first), then
   past dates (most recently passed first) so the admin's attention lands
   on what is coming up while still keeping the full history reachable.
 */
export async function getAdminImportantDates(): Promise<AdminImportantDateRow[]> {
  const todayUtc = ymdToUtcDate(getTodayYmd());
  invariant(todayUtc, "getTodayYmd() must produce a valid YMD");

  const [upcoming, past] = await Promise.all([
    prisma.importantDate.findMany({
      where: { date: { gte: todayUtc } },
      orderBy: [{ date: "asc" }, { createdAt: "asc" }],
      select: adminSelect,
    }),
    prisma.importantDate.findMany({
      where: { date: { lt: todayUtc } },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      select: adminSelect,
    }),
  ]);

  return [...upcoming, ...past];
}
