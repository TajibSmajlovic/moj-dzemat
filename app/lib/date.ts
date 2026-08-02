/**
   Public post dates are shown in the site timezone with Bosnian month
   names spelled out manually. That keeps SSR and the browser identical
   (hydration-safe): `Intl` + `bs-BA` can differ between Node and Chrome,
   and the default system timezone can differ between server and user.
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

/** 24-hour clock in the site TZ; en-GB never differs across runtimes. */
const siteTimeFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: SITE_TIMEZONE,
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
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

function getSiteHourMinute(value: Date | string | number): {
  hour: number;
  minute: number;
} | null {
  const instant = new Date(value);
  if (Number.isNaN(instant.getTime())) {
    return null;
  }

  const parts = siteTimeFormatter.formatToParts(instant);
  const hour = Number(parts.find((p) => p.type === "hour")?.value);
  const minute = Number(parts.find((p) => p.type === "minute")?.value);

  if (Number.isNaN(hour) || Number.isNaN(minute)) {
    return null;
  }

  return { hour, minute };
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

/**
   Long Bosnian date with 24-hour time, e.g. `30. april 2026. u 10:42`.
   Built from the same site-TZ parts machinery as `formatDateLong` so
   server and browser always produce identical output (`bs-BA` ICU data
   is incomplete in some browser builds and would otherwise render
   placeholders like `M04`).
 */
export function formatDateTimeLong(value: Date | string | number): string {
  const ymd = getSiteCalendarYmd(value);
  const hm = getSiteHourMinute(value);
  if (!ymd || !hm) {
    return "";
  }

  const monthName = MONTHS_LONG_BS[ymd.month - 1];
  if (!monthName) {
    return "";
  }

  return `${ymd.day}. ${monthName} ${ymd.year}. u ${pad2(hm.hour)}:${pad2(hm.minute)}`;
}

export function toIsoDate(value: Date | string | number): string {
  return new Date(value).toISOString();
}

// Short month + weekday labels for the date badge (e.g. "JUN", "PON").
// Derived from the existing long-month table so there is one source of truth.
const MONTHS_ABBR_BS = MONTHS_LONG_BS.map((m) => m.slice(0, 3).toUpperCase());
// Index 0 = Sunday, to match Date.prototype.getUTCDay().
const WEEKDAYS_ABBR_BS = ["NED", "PON", "UTO", "SRI", "ČET", "PET", "SUB"] as const;

const YMD_RE = /^\d{4}-\d{2}-\d{2}$/;

// Safely parse a "YYYY-MM-DD" string into numeric parts.
function parseYmd(value: string): { y: number; m: number; d: number } | null {
  if (!YMD_RE.test(value)) return null;

  const parts = value.split("-");
  const y = Number(parts[0]);
  const m = Number(parts[1]);
  const d = Number(parts[2]);
  if (!y || m < 1 || m > 12 || d < 1 || d > 31) return null;

  // Round-trip through a UTC date to reject impossible days (e.g. Feb 30).
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) {
    return null;
  }

  return { y, m, d };
}

// Validates a real "YYYY-MM-DD" calendar day (rejects e.g. 2026-02-30).
export function isValidYmd(value: unknown): value is string {
  return typeof value === "string" && parseYmd(value) !== null;
}

// Today's calendar day in the site timezone, as "YYYY-MM-DD".
export function getTodayYmd(): string {
  const ymd = getSiteCalendarYmd(new Date());
  if (!ymd) return ""; // unreachable: `new Date()` is always valid

  return `${ymd.year}-${pad2(ymd.month)}-${pad2(ymd.day)}`;
}

// "2026-06-16" -> "16. jun 2026." (matches formatDateLong output style).
export function formatYmdLong(ymd: string): string {
  const parts = parseYmd(ymd);
  if (!parts) return "";

  const monthName = MONTHS_LONG_BS[parts.m - 1];

  return monthName ? `${parts.d}. ${monthName} ${parts.y}.` : "";
}

// "2026-06-16" -> "16. jun" for annual dates whose year is shown separately.
export function formatYmdDayMonth(ymd: string): string {
  const parts = parseYmd(ymd);
  if (!parts) return "";

  const monthName = MONTHS_LONG_BS[parts.m - 1];

  return monthName ? `${parts.d}. ${monthName}` : "";
}

// Reuses a valid YMD month/day in another year. Returns null for missing days,
// such as 29 February in a non-leap year.
export function ymdWithYear(ymd: string, year: number): string | null {
  const parts = parseYmd(ymd);
  if (!parts || !Number.isInteger(year) || year < 1 || year > 9999) return null;

  const candidate = `${String(year).padStart(4, "0")}-${pad2(parts.m)}-${pad2(parts.d)}`;

  return isValidYmd(candidate) ? candidate : null;
}

// Badge parts for "YYYY-MM-DD": { month: "JUN", day: "16", weekday: "PON" }.
export function getYmdBadgeParts(
  ymd: string,
): { month: string; day: string; weekday: string } | null {
  const parts = parseYmd(ymd);
  if (!parts) return null;

  const weekday = WEEKDAYS_ABBR_BS[new Date(Date.UTC(parts.y, parts.m - 1, parts.d)).getUTCDay()];

  return { month: MONTHS_ABBR_BS[parts.m - 1] ?? "", day: pad2(parts.d), weekday: weekday ?? "" };
}

// ---- DateTime <-> YMD bridge (for the DateTime column) ------------------
// We store ImportantDate.date as UTC midnight, so the calendar day is the
// UTC date. These convert between the DB `Date` and the "YYYY-MM-DD" form
// the form input and the formatters use.

// "YYYY-MM-DD" -> Date at UTC midnight. Returns null for invalid input.
export function ymdToUtcDate(ymd: string): Date | null {
  if (!isValidYmd(ymd)) return null;

  return new Date(`${ymd}T00:00:00.000Z`);
}

// A stored Date (UTC midnight) -> "YYYY-MM-DD" using UTC parts.
export function dateToYmd(value: Date | string | number): string {
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return "";

  return `${dt.getUTCFullYear()}-${pad2(dt.getUTCMonth() + 1)}-${pad2(dt.getUTCDate())}`;
}
