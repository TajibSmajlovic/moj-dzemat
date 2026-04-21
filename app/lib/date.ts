/**
 * Public post dates are shown in the site timezone with Bosnian month
 * names spelled out manually. That keeps SSR and the browser identical
 * (hydration-safe): `Intl` + `bs-BA` can differ between Node and Chrome,
 * and the default system timezone can differ between server and user.
 */

const SITE_TIMEZONE = "Europe/Sarajevo";

const MONTHS_LONG_BS = [
  "januar",
  "februar",
  "mart",
  "april",
  "maj",
  "jun",
  "jul",
  "august",
  "septembar",
  "oktobar",
  "novembar",
  "decembar",
] as const;

/** Digits-only calendar in the site TZ; locale is fixed for stable parsing. */
const siteCalendarFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: SITE_TIMEZONE,
  year: "numeric",
  month: "numeric",
  day: "numeric",
});

function getSiteCalendarYmd(value: Date | string | number): {
  year: number;
  month: number;
  day: number;
} | null {
  const instant = new Date(value);
  if (Number.isNaN(instant.getTime())) {
    return null;
  }

  const parts = siteCalendarFormatter.formatToParts(instant);
  const year = Number(parts.find((p) => p.type === "year")?.value);
  const month = Number(parts.find((p) => p.type === "month")?.value);
  const day = Number(parts.find((p) => p.type === "day")?.value);

  if (!year || !month || !day) {
    return null;
  }

  return { year, month, day };
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

export function formatDateLong(value: Date | string | number): string {
  const ymd = getSiteCalendarYmd(value);
  if (!ymd) {
    return "";
  }

  const monthName = MONTHS_LONG_BS[ymd.month - 1];
  if (!monthName) {
    return "";
  }

  return `${ymd.day}. ${monthName} ${ymd.year}.`;
}

export function formatDateShort(value: Date | string | number): string {
  const ymd = getSiteCalendarYmd(value);
  if (!ymd) {
    return "";
  }

  return `${pad2(ymd.day)}.${pad2(ymd.month)}.${ymd.year}`;
}

export function toIsoDate(value: Date | string | number): string {
  return new Date(value).toISOString();
}
