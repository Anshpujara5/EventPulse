// Shared parsing for explicit analytics dates and preset Postgres intervals.
// Preset mapping remains shared so the events and analytics controllers agree.

export type TimeRangeToken = "24h" | "7d" | "30d" | "all";

export interface CustomDateRange {
  from: string;
  to: string;
  endExclusive: string;
  previousFrom: string;
  dayCount: number;
  includesToday: boolean;
}

export type CustomDateRangeResult =
  | { valid: true; value: CustomDateRange }
  | { valid: false; message: string };

const ISO_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;

function parseIsoCalendarDate(value: string): Date | null {
  const match = ISO_DATE_PATTERN.exec(value);
  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (year < 1) {
    return null;
  }

  const date = new Date(0);
  date.setUTCHours(0, 0, 0, 0);
  date.setUTCFullYear(year, month - 1, day);

  return date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
    ? date
    : null;
}

function localTodayIsoDate(now: Date): string {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function parseCustomDateRange(
  from: unknown,
  to: unknown,
  now = new Date(),
): CustomDateRangeResult {
  if (typeof from !== "string" || typeof to !== "string" || !from || !to) {
    return {
      valid: false,
      message: "Custom date range requires both from and to dates",
    };
  }

  const fromDate = parseIsoCalendarDate(from);
  const toDate = parseIsoCalendarDate(to);
  if (!fromDate || !toDate) {
    return {
      valid: false,
      message: "Custom range dates must be valid YYYY-MM-DD calendar dates",
    };
  }

  if (from > to) {
    return {
      valid: false,
      message: "Custom range from date must be on or before to date",
    };
  }

  const today = localTodayIsoDate(now);
  if (to > today) {
    return {
      valid: false,
      message: "Custom range to date cannot be in the future",
    };
  }

  const dayCount =
    Math.floor((toDate.getTime() - fromDate.getTime()) / MILLISECONDS_PER_DAY) + 1;
  const previousFromDate = new Date(
    fromDate.getTime() - dayCount * MILLISECONDS_PER_DAY,
  );
  const endExclusiveDate = new Date(
    toDate.getTime() + MILLISECONDS_PER_DAY,
  );

  return {
    valid: true,
    value: {
      from,
      to,
      endExclusive: endExclusiveDate.toISOString().slice(0, 10),
      previousFrom: previousFromDate.toISOString().slice(0, 10),
      dayCount,
      includesToday: to === today,
    },
  };
}

export function rangeToInterval(range: unknown): string | null {
  switch (range) {
    case "24h":
      return "24 hours";
    case "7d":
      return "7 days";
    case "30d":
      return "30 days";
    default:
      // "all", missing, or anything unexpected → no time filter.
      return null;
  }
}
