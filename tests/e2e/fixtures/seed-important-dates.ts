import { getTodayYmd } from "../../../app/lib/date";
import { prisma } from "../../../app/server/db.server";
import { createImportantDate } from "../../factories";

type SeededImportantDate = {
  key: string;
  title: string;
  date: string; // "YYYY-MM-DD"
  description: string | null;
  recursYearly: boolean;
};

const E2E_CURRENT_YEAR = Number(getTodayYmd().slice(0, 4));

// December 31 is always in the current public window. The recurring source
// starts in the current year so this remains valid even when run on that day.
const SEEDED_IMPORTANT_DATES = [
  {
    key: "future",
    title: "E2E važan nadolazeći datum",
    date: `${E2E_CURRENT_YEAR}-12-31`,
    description: "Nadolazeći E2E datum koji se prikazuje na početnoj stranici.",
    recursYearly: true,
  },
  {
    key: "past",
    title: "E2E prošli važan datum",
    date: `${E2E_CURRENT_YEAR - 1}-12-31`,
    description: "Prošli E2E datum koji se prikazuje samo u admin panelu.",
    recursYearly: false,
  },
] as const satisfies readonly [SeededImportantDate, SeededImportantDate];

/**
   Restores the important-date rows used by `vazni-datumi.spec.ts` and the
   public home page calendar.

   Restore-safe: rows are matched on title and reset to their seeded date,
   description, and recurrence. Dates a spec created itself are left
   alone. Nothing caches these, so a direct write is visible to the
   running server immediately.
 */
export async function ensureImportantDates() {
  for (const seeded of SEEDED_IMPORTANT_DATES) {
    const existing = await prisma.importantDate.findFirst({
      where: { title: seeded.title },
      select: { id: true },
    });

    // `createImportantDate` normalises the "YYYY-MM-DD" string to UTC
    // midnight, so recreate through it rather than duplicating that
    // conversion for the update path.
    if (existing) {
      await prisma.importantDate.delete({ where: { id: existing.id } });
    }

    await createImportantDate({
      title: seeded.title,
      date: seeded.date,
      description: seeded.description,
      recursYearly: seeded.recursYearly,
    });
  }
}
