const ISO_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;

export interface AnalyticsDateRange {
  from: string;
  to: string;
  dayCount: number;
  label: string;
}

export type AnalyticsDateRangeValidation =
  | { valid: true; value: AnalyticsDateRange }
  | { valid: false; message: string };

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

export function getTodayIsoDate(now = new Date()): string {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function formatAnalyticsDateRangeLabel(
  from: string,
  to: string,
): string {
  const fromDate = parseIsoCalendarDate(from);
  const toDate = parseIsoCalendarDate(to);

  if (!fromDate || !toDate) {
    return "Custom range";
  }

  const shortDate = new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
  const fullDate = new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });

  if (from === to) {
    return fullDate.format(fromDate);
  }

  if (fromDate.getUTCFullYear() === toDate.getUTCFullYear()) {
    return `${shortDate.format(fromDate)} – ${fullDate.format(toDate)}`;
  }

  return `${fullDate.format(fromDate)} – ${fullDate.format(toDate)}`;
}

export function validateAnalyticsDateRange(
  from: string | null | undefined,
  to: string | null | undefined,
  today = getTodayIsoDate(),
): AnalyticsDateRangeValidation {
  if (!from || !to) {
    return {
      valid: false,
      message: "Choose both a start date and an end date.",
    };
  }

  const fromDate = parseIsoCalendarDate(from);
  const toDate = parseIsoCalendarDate(to);
  if (!fromDate || !toDate) {
    return {
      valid: false,
      message: "Use valid calendar dates in YYYY-MM-DD format.",
    };
  }

  if (from > to) {
    return {
      valid: false,
      message: "Start date must be on or before end date.",
    };
  }

  if (to > today) {
    return {
      valid: false,
      message: "End date cannot be in the future.",
    };
  }

  return {
    valid: true,
    value: {
      from,
      to,
      dayCount:
        Math.floor((toDate.getTime() - fromDate.getTime()) / MILLISECONDS_PER_DAY) +
        1,
      label: formatAnalyticsDateRangeLabel(from, to),
    },
  };
}
