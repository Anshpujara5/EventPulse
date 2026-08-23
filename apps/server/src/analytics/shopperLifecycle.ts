import { Prisma } from "@prisma/client";
import type { AnalyticsScope } from "./analyticsScope";
import { percentOrNull, toCount } from "./shared/numbers";
import type { TrendGranularity } from "./trend";
import { prisma } from "../config/prisma";

interface ShopperLifecycleRow {
  bucket: string | null;
  activeShoppers: bigint;
  newShoppers: bigint;
  returningShoppers: bigint;
  summaryActiveShoppers: bigint;
  summaryNewShoppers: bigint;
  summaryReturningShoppers: bigint;
}

// MIRROR: apps/web/components/dashboard/analytics/analytics-types.ts
export type ShopperLifecycleSummary =
  | {
      status: "available";
      activeShoppers: number;
      newShoppers: number;
      returningShoppers: number;
      newPercent: number | null;
      returningPercent: number | null;
    }
  | {
      status: "not-applicable";
      reason: "unbounded-range";
      message: string;
    };

export interface ShopperLifecyclePoint {
  date: string;
  activeShoppers: number;
  newShoppers: number;
  returningShoppers: number;
}

export interface ShopperLifecycleSeries {
  granularity: TrendGranularity;
  points: ShopperLifecyclePoint[];
}

export interface ShopperLifecycle {
  summary: ShopperLifecycleSummary;
  series: ShopperLifecycleSeries;
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

// This intentionally mirrors shopperTrend.ts so B1 and B2 share exact bucket
// boundaries. Consolidation remains scheduled for the post-Phase-3 debt chore.
function shopperLifecycleBucketsCte(
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
        FROM shopper_events
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

function shopperClassificationCtes(scope: AnalyticsScope): Prisma.Sql {
  const priorScope = scope.sql.priorToRangeEvent;

  if (priorScope === null) {
    return Prisma.sql`
      classified_shoppers AS MATERIALIZED (
        SELECT
          f."projectId",
          f.customer_id,
          f.first_in_range_at,
          FALSE AS has_prior_history
        FROM first_in_range f
      ),
    `;
  }

  // Ownership and the strict pre-range boundary remain centralized in
  // AnalyticsScope. Normalize retained history once instead of probing it once
  // per active shopper, which prevents repeated historical range scans.
  return Prisma.sql`
    prior_shoppers AS (
      SELECT DISTINCT
        prior."projectId",
        NULLIF(BTRIM(prior."customerId"), '') AS customer_id
      FROM "Event" prior
      WHERE ${priorScope}
        AND NULLIF(BTRIM(prior."customerId"), '') IS NOT NULL
    ),
    classified_shoppers AS MATERIALIZED (
      SELECT
        f."projectId",
        f.customer_id,
        f.first_in_range_at,
        (p.customer_id IS NOT NULL) AS has_prior_history
      FROM first_in_range f
      LEFT JOIN prior_shoppers p
        ON p."projectId" = f."projectId"
        AND p.customer_id = f.customer_id
    ),
  `;
}

function emptyLifecycle(scope: AnalyticsScope): ShopperLifecycle {
  return {
    summary: scope.range.isAllTime
      ? {
          status: "not-applicable",
          reason: "unbounded-range",
          message:
            "New versus returning for the selected period needs a bounded date range.",
        }
      : {
          status: "available",
          activeShoppers: 0,
          newShoppers: 0,
          returningShoppers: 0,
          newPercent: null,
          returningPercent: null,
        },
    series: { granularity: "day", points: [] },
  };
}

/**
 * B2 New vs Returning Shoppers.
 *
 * The selected-period split and lifecycle series share one statement. The
 * only historical work is a pre-range existence check; first-bucket timing is
 * derived exclusively from rows already inside the selected range.
 */
export async function fetchShopperLifecycle(
  scope: AnalyticsScope,
  granularity: TrendGranularity | null,
): Promise<ShopperLifecycle> {
  if (granularity === null) {
    return emptyLifecycle(scope);
  }

  const rows = await prisma.$queryRaw<ShopperLifecycleRow[]>`
    WITH
    scoped_events AS (
      SELECT "projectId", "customerId", "createdAt"
      FROM "Event"
      WHERE ${scope.sql.currentEvent}
    ),
    shopper_events AS (
      SELECT
        "projectId",
        NULLIF(BTRIM("customerId"), '') AS customer_id,
        "createdAt",
        date_trunc(${granularity}, "createdAt") AS bucket
      FROM scoped_events
      WHERE NULLIF(BTRIM("customerId"), '') IS NOT NULL
    ),
    active_bucket_membership AS (
      SELECT DISTINCT "projectId", customer_id, bucket
      FROM shopper_events
    ),
    first_in_range AS (
      SELECT
        "projectId",
        customer_id,
        MIN("createdAt") AS first_in_range_at
      FROM shopper_events
      GROUP BY "projectId", customer_id
    ),
    ${shopperClassificationCtes(scope)}
    classified_bucket_membership AS (
      SELECT
        m."projectId",
        m.customer_id,
        m.bucket,
        CASE
          WHEN c.has_prior_history THEN FALSE
          ELSE m.bucket = date_trunc(${granularity}, c.first_in_range_at)
        END AS is_new
      FROM active_bucket_membership m
      INNER JOIN classified_shoppers c
        ON c."projectId" = m."projectId"
        AND c.customer_id = m.customer_id
    ),
    selected_period_summary AS (
      SELECT
        COUNT(*) AS active_shoppers,
        COUNT(*) FILTER (WHERE NOT has_prior_history) AS new_shoppers,
        COUNT(*) FILTER (WHERE has_prior_history) AS returning_shoppers
      FROM classified_shoppers
    ),
    ${shopperLifecycleBucketsCte(scope, granularity)}
    SELECT
      CASE
        WHEN b.bucket IS NULL THEN NULL
        ELSE TO_CHAR(b.bucket, 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
      END AS bucket,
      COUNT(m.customer_id) AS "activeShoppers",
      COUNT(m.customer_id) FILTER (WHERE m.is_new) AS "newShoppers",
      COUNT(m.customer_id) FILTER (WHERE NOT m.is_new) AS "returningShoppers",
      s.active_shoppers AS "summaryActiveShoppers",
      s.new_shoppers AS "summaryNewShoppers",
      s.returning_shoppers AS "summaryReturningShoppers"
    FROM selected_period_summary s
    LEFT JOIN buckets b ON TRUE
    LEFT JOIN classified_bucket_membership m ON m.bucket = b.bucket
    GROUP BY
      b.bucket,
      s.active_shoppers,
      s.new_shoppers,
      s.returning_shoppers
    ORDER BY b.bucket ASC NULLS LAST
  `;

  const summaryActiveShoppers = toCount(rows[0]?.summaryActiveShoppers);
  const summaryNewShoppers = toCount(rows[0]?.summaryNewShoppers);
  const summaryReturningShoppers = toCount(
    rows[0]?.summaryReturningShoppers,
  );

  return {
    summary: scope.range.isAllTime
      ? {
          status: "not-applicable",
          reason: "unbounded-range",
          message:
            "New versus returning for the selected period needs a bounded date range.",
        }
      : {
          status: "available",
          activeShoppers: summaryActiveShoppers,
          newShoppers: summaryNewShoppers,
          returningShoppers: summaryReturningShoppers,
          newPercent: percentOrNull(
            summaryNewShoppers,
            summaryActiveShoppers,
          ),
          returningPercent: percentOrNull(
            summaryReturningShoppers,
            summaryActiveShoppers,
          ),
        },
    series: {
      granularity,
      points: rows.flatMap((row) =>
        row.bucket === null
          ? []
          : [
              {
                date: row.bucket,
                activeShoppers: toCount(row.activeShoppers),
                newShoppers: toCount(row.newShoppers),
                returningShoppers: toCount(row.returningShoppers),
              },
            ],
      ),
    },
  };
}
