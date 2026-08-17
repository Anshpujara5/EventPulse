import { Prisma } from "@prisma/client";
import type { AnalyticsScope } from "./analyticsScope";
import { percentOrNull, toCount } from "./shared/numbers";
import type { TrendGranularity } from "./trend";
import { prisma } from "../config/prisma";

interface ShopperTrendRow {
  bucket: string | null;
  shoppers: bigint;
  eventsInScope: bigint;
  eventsWithCustomerId: bigint;
}

// MIRROR: apps/web/components/dashboard/analytics/analytics-types.ts
export interface ShopperTrendPoint {
  date: string;
  shoppers: number;
}

export interface ShopperTrend {
  granularity: TrendGranularity;
  points: ShopperTrendPoint[];
}

export interface ShopperCoverage {
  eventsInScope: number;
  eventsWithCustomerId: number;
  excludedPercent: number | null;
}

export interface ShopperTrendResult {
  trend: ShopperTrend;
  coverage: ShopperCoverage;
}

function fixedBucketSpec(scope: AnalyticsScope): {
  start: Prisma.Sql;
  end: Prisma.Sql;
  step: string;
} {
  if (scope.range.key === "24h") {
    return {
      start: Prisma.sql`date_trunc('hour', NOW() - INTERVAL '23 hours')`,
      end: Prisma.sql`date_trunc('hour', NOW())`,
      step: "1 hour",
    };
  }

  const lookback = scope.range.key === "7d" ? "6 days" : "29 days";
  return {
    start: Prisma.sql`date_trunc('day', NOW() - ${lookback}::interval)`,
    end: Prisma.sql`date_trunc('day', NOW())`,
    step: "1 day",
  };
}

// DEBT: This is the third trend-bucket implementation alongside trend.ts and
// sales.ts. Consolidate them in the planned post-Phase-3 debt chore.
function shopperTrendBucketsCte(
  scope: AnalyticsScope,
  granularity: TrendGranularity,
): Prisma.Sql {
  if (scope.range.isCustom) {
    const step =
      granularity === "hour"
        ? "1 hour"
        : granularity === "day"
          ? "1 day"
          : "1 month";
    const end =
      granularity === "hour"
        ? Prisma.sql`(${scope.range.custom.to}::date + INTERVAL '23 hours')`
        : Prisma.sql`date_trunc(${granularity}, ${scope.range.custom.to}::date)`;

    return Prisma.sql`
      buckets AS (
        SELECT generate_series(
          date_trunc(${granularity}, ${scope.range.custom.from}::date),
          ${end},
          ${step}::interval
        ) AS bucket
      )
    `;
  }

  if (scope.range.isAllTime) {
    const step = granularity === "day" ? "1 day" : "1 month";
    return Prisma.sql`
      bounds AS (
        SELECT
          MIN(bucket) AS start_bucket,
          date_trunc(${granularity}, NOW()) AS end_bucket
        FROM shopper_points
      ),
      buckets AS (
        SELECT generate_series(start_bucket, end_bucket, ${step}::interval) AS bucket
        FROM bounds
      )
    `;
  }

  const spec = fixedBucketSpec(scope);
  return Prisma.sql`
    buckets AS (
      SELECT generate_series(${spec.start}, ${spec.end}, ${spec.step}::interval) AS bucket
    )
  `;
}

export async function fetchShopperTrend(
  scope: AnalyticsScope,
  granularity: TrendGranularity | null,
): Promise<ShopperTrendResult> {
  if (granularity === null) {
    return {
      trend: { granularity: "day", points: [] },
      coverage: {
        eventsInScope: 0,
        eventsWithCustomerId: 0,
        excludedPercent: null,
      },
    };
  }

  const rows = await prisma.$queryRaw<ShopperTrendRow[]>`
    WITH
    scoped_events AS (
      SELECT "projectId", "customerId", "createdAt"
      FROM "Event"
      WHERE ${scope.sql.currentEvent}
    ),
    shopper_points AS (
      SELECT
        date_trunc(${granularity}, "createdAt") AS bucket,
        "projectId",
        NULLIF(BTRIM("customerId"), '') AS customer_id
      FROM scoped_events
      WHERE NULLIF(BTRIM("customerId"), '') IS NOT NULL
    ),
    coverage AS (
      SELECT
        COUNT(*) AS events_in_scope,
        COUNT(*) FILTER (
          WHERE NULLIF(BTRIM("customerId"), '') IS NOT NULL
        ) AS events_with_customer_id
      FROM scoped_events
    ),
    ${shopperTrendBucketsCte(scope, granularity)}
    SELECT
      CASE
        WHEN b.bucket IS NULL THEN NULL
        ELSE TO_CHAR(b.bucket, 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
      END AS bucket,
      COUNT(DISTINCT (p."projectId", p.customer_id)) FILTER (
        WHERE p.customer_id IS NOT NULL
      ) AS shoppers,
      c.events_in_scope AS "eventsInScope",
      c.events_with_customer_id AS "eventsWithCustomerId"
    FROM coverage c
    LEFT JOIN buckets b ON TRUE
    LEFT JOIN shopper_points p ON p.bucket = b.bucket
    GROUP BY b.bucket, c.events_in_scope, c.events_with_customer_id
    ORDER BY b.bucket ASC NULLS LAST
  `;

  const eventsInScope = toCount(rows[0]?.eventsInScope);
  const eventsWithCustomerId = toCount(rows[0]?.eventsWithCustomerId);

  return {
    trend: {
      granularity,
      points: rows.flatMap((row) =>
        row.bucket === null
          ? []
          : [{ date: row.bucket, shoppers: toCount(row.shoppers) }],
      ),
    },
    coverage: {
      eventsInScope,
      eventsWithCustomerId,
      excludedPercent: percentOrNull(
        eventsInScope - eventsWithCustomerId,
        eventsInScope,
      ),
    },
  };
}
