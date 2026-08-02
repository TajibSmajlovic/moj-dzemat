import type { Prisma } from "#generated/prisma/client";

import { dateToYmd, getTodayYmd, ymdToUtcDate, ymdWithYear } from "#app/lib/date";
import { invariant } from "#app/lib/invariant";
import { prisma } from "#app/server/db.server";

export type PublicImportantDate = {
  id: string;
  title: string;
  date: Date; // UTC midnight; convert with dateToYmd() before display
  description: string | null;
};

export type AdminImportantDateRow = PublicImportantDate & {
  recursYearly: boolean;
  createdAt: Date;
};

type ImportantDateQueryOptions = {
  todayYmd?: string;
};

const candidateSelect = {
  id: true,
  title: true,
  date: true,
  description: true,
  recursYearly: true,
  createdAt: true,
} satisfies Prisma.ImportantDateSelect;

const adminSelect = {
  ...candidateSelect,
} satisfies Prisma.ImportantDateSelect;

// Public dates are limited to the rest of the current calendar year.
// Annual rows are projected onto the current year without changing the stored row.
export async function getUpcomingImportantDates(
  options: ImportantDateQueryOptions = {},
): Promise<PublicImportantDate[]> {
  const bounds = getCurrentYearBounds(options.todayYmd);

  const candidates = await prisma.importantDate.findMany({
    where: {
      OR: [
        {
          recursYearly: false,
          date: { gte: bounds.todayUtc, lt: bounds.nextYearUtc },
        },
        {
          recursYearly: true,
          date: { lt: bounds.nextYearUtc },
        },
      ],
    },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    select: candidateSelect,
  });

  const occurrences = candidates.flatMap((candidate) => {
    const occurrenceDate = candidate.recursYearly
      ? getYearlyOccurrenceDate(candidate.date, bounds.currentYear)
      : candidate.date;

    if (!occurrenceDate) return [];

    const occurrenceYmd = dateToYmd(occurrenceDate);
    if (occurrenceYmd < bounds.todayYmd || occurrenceYmd >= bounds.nextYearYmd) return [];

    return [{ ...candidate, date: occurrenceDate }];
  });

  occurrences.sort(
    (left, right) =>
      left.date.getTime() - right.date.getTime() ||
      left.createdAt.getTime() - right.createdAt.getTime() ||
      left.id.localeCompare(right.id),
  );

  return occurrences.map(({ id, title, date, description }) => ({
    id,
    title,
    date,
    description,
  }));
}

/**
   Admin sees ALL rows. Upcoming dates come first (nearest first), then
   past dates (most recently passed first) so the admin's attention lands
   on what is coming up while still keeping the full history reachable.
 */
export async function getAdminImportantDates(
  options: ImportantDateQueryOptions = {},
): Promise<AdminImportantDateRow[]> {
  const bounds = getCurrentYearBounds(options.todayYmd);
  const dates = await prisma.importantDate.findMany({ select: adminSelect });

  // The project targets ES2022, where Array#toSorted is not available.
  // eslint-disable-next-line unicorn/no-array-sort
  return [...dates].sort((left, right) => compareAdminDates(left, right, bounds.todayYmd));
}

function getCurrentYearBounds(todayOverride?: string) {
  const todayYmd = todayOverride ?? getTodayYmd();
  const currentYear = Number(todayYmd.slice(0, 4));
  const nextYearYmd = `${currentYear + 1}-01-01`;
  const todayUtc = ymdToUtcDate(todayYmd);
  const nextYearUtc = ymdToUtcDate(nextYearYmd);

  invariant(todayUtc, "Today must be a valid YMD date");
  invariant(nextYearUtc, "Next year boundary must be a valid YMD date");

  return { todayYmd, todayUtc, currentYear, nextYearYmd, nextYearUtc };
}

function getYearlyOccurrenceDate(sourceDate: Date, year: number): Date | null {
  const occurrenceYmd = ymdWithYear(dateToYmd(sourceDate), year);

  return occurrenceYmd ? ymdToUtcDate(occurrenceYmd) : null;
}

function compareAdminDates(
  left: AdminImportantDateRow,
  right: AdminImportantDateRow,
  todayYmd: string,
) {
  const leftSort = getAdminSortValue(left, todayYmd);
  const rightSort = getAdminSortValue(right, todayYmd);

  return (
    leftSort.group - rightSort.group ||
    leftSort.timestamp - rightSort.timestamp ||
    left.createdAt.getTime() - right.createdAt.getTime() ||
    left.id.localeCompare(right.id)
  );
}

function getAdminSortValue(date: AdminImportantDateRow, todayYmd: string) {
  if (date.recursYearly) {
    return { group: 0, timestamp: getNextYearlyOccurrence(date.date, todayYmd).getTime() };
  }

  const timestamp = date.date.getTime();
  if (dateToYmd(date.date) >= todayYmd) return { group: 0, timestamp };

  return { group: 1, timestamp: -timestamp };
}

function getNextYearlyOccurrence(sourceDate: Date, todayYmd: string): Date {
  const sourceYmd = dateToYmd(sourceDate);
  const sourceYear = Number(sourceYmd.slice(0, 4));
  const currentYear = Number(todayYmd.slice(0, 4));

  for (let year = Math.max(sourceYear, currentYear); year <= currentYear + 8; year += 1) {
    const occurrence = getYearlyOccurrenceDate(sourceDate, year);
    if (occurrence && dateToYmd(occurrence) >= todayYmd) return occurrence;
  }

  return sourceDate;
}
