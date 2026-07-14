import { Prisma } from "@prisma/client";
import type { AnalyticsScope } from "./analyticsScope";
import { toCount } from "./shared/numbers";
import { prisma } from "../config/prisma";
import type { TimeRangeToken } from "../utils/timeRange";

interface TrendPointRow {
  bucket: string;
  count: bigint;
}

interface SpanRow {
  spanDays: number | null;
}

export type TrendGranularity = "hour" | "day" | "month";

export interface TrendPoint {
  date: string;
  count: number;
}

export interface EventTrend {
  granularity: TrendGranularity;
  points: TrendPoint[];
}

// "createdAt" is stored as a naive `timestamp` column. Trend bucketing keeps
// the existing database-session timezone convention used by all analytics
// range queries and deliberately does not reinterpret values with AT TIME ZONE.
const ALL_TIME_MONTHLY_THRESHOLD_DAYS = 60;

interface FixedRangeSpec {
  granularity: TrendGranularity;
  lookback: string;
  step: string;
}

const FIXED_RANGE_SPECS: Record<Exclude<TimeRangeToken, "all">, FixedRangeSpec> = {
  "24h": { granularity: "hour", lookback: "23 hours", step: "1 hour" },
  "7d": { granularity: "day", lookback: "6 days", step: "1 day" },
  "30d": { granularity: "day", lookback: "29 days", step: "1 day" },
};

function customTrendGranularity(dayCount: number): TrendGranularity {
  if (dayCount === 1) return "hour";
  return dayCount <= ALL_TIME_MONTHLY_THRESHOLD_DAYS ? "day" : "month";
}

export async function fetchTrendSpanDays(
  scope: AnalyticsScope,
): Promise<number | null> {
  const [spanRow] = await prisma.$queryRaw<SpanRow[]>`
    SELECT (CURRENT_DATE - MIN("createdAt")::date) AS "spanDays"
    FROM "Event"
    WHERE ${scope.sql.ownedEvent}
  `;

  return spanRow?.spanDays ?? null;
}

export function resolveTrendGranularity(
  scope: AnalyticsScope,
  allTimeSpanDays: number | null,
): TrendGranularity | null {
  if (scope.range.isCustom) {
    return customTrendGranularity(scope.range.dayCount);
  }

  if (scope.range.key === "all") {
    if (allTimeSpanDays === null) return null;
    return allTimeSpanDays <= ALL_TIME_MONTHLY_THRESHOLD_DAYS ? "day" : "month";
  }

  return FIXED_RANGE_SPECS[scope.range.key].granularity;
}

export async function fetchTrend(
  scope: AnalyticsScope,
  allTimeGranularity: TrendGranularity | null,
): Promise<TrendPoint[]> {
  let rows: TrendPointRow[];

  if (scope.range.isCustom) {
    const customRange = scope.range.custom;
    const granularity = customTrendGranularity(scope.range.dayCount);
    const step =
      granularity === "hour"
        ? "1 hour"
        : granularity === "day"
          ? "1 day"
          : "1 month";
    const endBucket =
      granularity === "hour"
        ? Prisma.sql`(${customRange.to}::date + INTERVAL '23 hours')`
        : Prisma.sql`date_trunc(${granularity}, ${customRange.to}::date)`;

    rows = await prisma.$queryRaw<TrendPointRow[]>`
      WITH buckets AS (
        SELECT generate_series(
          date_trunc(${granularity}, ${customRange.from}::date),
          ${endBucket},
          ${step}::interval
        ) AS bucket
      )
      SELECT
        TO_CHAR(b.bucket, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS bucket,
        COALESCE(COUNT(e.id), 0) AS count
      FROM buckets b
      LEFT JOIN "Event" e
        ON date_trunc(${granularity}, e."createdAt") = b.bucket
        AND ${scope.sql.currentAliasedEvent}
      GROUP BY b.bucket
      ORDER BY b.bucket ASC
    `;
  } else if (scope.range.key === "all") {
    if (!allTimeGranularity) {
      rows = [];
    } else {
      const step = allTimeGranularity === "day" ? "1 day" : "1 month";
      rows = await prisma.$queryRaw<TrendPointRow[]>`
        WITH bounds AS (
          SELECT
            date_trunc(${allTimeGranularity}, MIN("createdAt")) AS "start",
            date_trunc(${allTimeGranularity}, NOW()) AS "end"
          FROM "Event"
          WHERE ${scope.sql.ownedEvent}
        ),
        buckets AS (
          SELECT generate_series(bounds."start", bounds."end", ${step}::interval) AS bucket
          FROM bounds
        )
        SELECT
          TO_CHAR(b.bucket, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS bucket,
          COALESCE(COUNT(e.id), 0) AS count
        FROM buckets b
        LEFT JOIN "Event" e
          ON date_trunc(${allTimeGranularity}, e."createdAt") = b.bucket
          AND ${scope.sql.ownedAliasedEvent}
        GROUP BY b.bucket
        ORDER BY b.bucket ASC
      `;
    }
  } else {
    const spec = FIXED_RANGE_SPECS[scope.range.key];
    rows = await prisma.$queryRaw<TrendPointRow[]>`
      WITH buckets AS (
        SELECT generate_series(
          date_trunc(${spec.granularity}, NOW() - ${spec.lookback}::interval),
          date_trunc(${spec.granularity}, NOW()),
          ${spec.step}::interval
        ) AS bucket
      )
      SELECT
        TO_CHAR(b.bucket, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS bucket,
        COALESCE(COUNT(e.id), 0) AS count
      FROM buckets b
      LEFT JOIN "Event" e
        ON date_trunc(${spec.granularity}, e."createdAt") = b.bucket
        AND ${scope.sql.ownedAliasedEvent}
      GROUP BY b.bucket
      ORDER BY b.bucket ASC
    `;
  }

  return rows.map((row) => ({
    date: row.bucket,
    count: toCount(row.count),
  }));
}
