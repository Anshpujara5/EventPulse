import { Prisma } from "@prisma/client";
import type { Response } from "express";
import { createAnalyticsScope } from "../analytics/analyticsScope";
import {
  buildComparison,
  fetchPeriodComparison,
  type ComparisonDirection,
  type PeriodComparisonCounts,
} from "../analytics/comparison";
import {
  fetchEventActivity,
  type ProjectEventCount,
  type TopEvent,
} from "../analytics/eventActivity";
import {
  buildCommerceFunnel,
  fetchCommerceCounts,
} from "../analytics/commerceFunnel";
import { SESSION_FUNNEL_STEPS } from "../analytics/shared/aliases";
import { percentOrNull, roundPct, toCount } from "../analytics/shared/numbers";
import {
  buildSessionFunnel,
  fetchSessionFunnel,
} from "../analytics/sessionFunnel";
import { fetchShopperSummary } from "../analytics/shopperSummary";
import {
  fetchTrend,
  fetchTrendSpanDays,
  resolveTrendGranularity,
  type TrendPoint,
} from "../analytics/trend";
import { prisma } from "../config/prisma";
import type { AuthRequest } from "../middleware/auth.middleware";

// ---------------------------------------------------------------------------
// Row types for typed raw queries
// ---------------------------------------------------------------------------

interface ProductPerformanceRow {
  projectId: string;
  projectName: string;
  productId: string;
  productName: string | null;
  viewSessions: bigint;
  cartSessions: bigint;
  sessionsThatPurchased: bigint;
  viewPurchaseSessions: bigint;
  cartPurchaseSessions: bigint;
  unitsAddedToCart: Prisma.Decimal | null;
  gmv: Prisma.Decimal | null;
  currency: string | null;
}

interface CategoryPerformanceRow {
  projectId: string;
  projectName: string;
  category: string;
  viewSessions: bigint;
  cartSessions: bigint;
  sessionsThatPurchased: bigint;
  viewPurchaseSessions: bigint;
  cartPurchaseSessions: bigint;
  unitsAddedToCart: Prisma.Decimal | null;
  gmv: Prisma.Decimal | null;
  currency: string | null;
}

// ---------------------------------------------------------------------------
// Insights — simple, rule-based signals computed from the same scoped data
// as the rest of this endpoint. Every number comes from a real query; there
// is no fabricated or estimated data here.
// ---------------------------------------------------------------------------

type InsightType =
  | "spike"
  | "drop"
  | "growth"
  | "inactive"
  | "dominant_event"
  | "project_hotspot"
  | "info";

type InsightSeverity = "info" | "warning" | "critical";

interface AnalyticsInsight {
  id: string;
  type: InsightType;
  severity: InsightSeverity;
  title: string;
  description: string;
  metricLabel?: string;
  metricValue?: string | number;
}

const GROWTH_THRESHOLD_PCT = 20; // current period >= previous * 1.20
const DROP_THRESHOLD_PCT = 20; // current period <= previous * 0.80
const CRITICAL_DROP_PCT = 70;
const DOMINANCE_THRESHOLD_PCT = 50;
const ANOMALY_RATIO_THRESHOLD = 3;
const CRITICAL_ANOMALY_RATIO = 6;
const MAX_INSIGHTS = 5;

// ---------------------------------------------------------------------------
// Health score — a simple rule-based rollup over the same scoped data used
// above. Starts at 100 and subtracts points for real, observed issues.
// ---------------------------------------------------------------------------

type HealthStatus = "healthy" | "watch" | "risk" | "inactive";

interface AnalyticsHealth {
  score: number;
  status: HealthStatus;
  reasons: string[];
}

const HEALTH_DOMINANCE_THRESHOLD_PCT = 70;
const HEALTH_SEVERE_DROP_PCT = 50;
const HEALTH_LOW_VARIETY_MIN_EVENTS = 20;

function buildHealth(params: {
  scopedTotal: number;
  eventsToday: number;
  uniqueEventNames: number;
  checkTodayActivity: boolean;
  projectId: string | null;
  topEvent: { percentage: number } | undefined;
  topProject: { percentage: number } | undefined;
  comparisonDirection: ComparisonDirection;
  comparisonChangePercent: number | null;
  hasCriticalSpike: boolean;
}): AnalyticsHealth {
  const {
    scopedTotal,
    eventsToday,
    uniqueEventNames,
    checkTodayActivity,
    projectId,
    topEvent,
    topProject,
    comparisonDirection,
    comparisonChangePercent,
    hasCriticalSpike,
  } = params;

  if (scopedTotal === 0) {
    return {
      score: 0,
      status: "inactive",
      reasons: ["No events received in this scope."],
    };
  }

  let score = 100;
  const reasons: string[] = [];

  if (topEvent && topEvent.percentage > HEALTH_DOMINANCE_THRESHOLD_PCT) {
    score -= 20;
    reasons.push("One event dominates most activity.");
  }

  if (!projectId && topProject && topProject.percentage > HEALTH_DOMINANCE_THRESHOLD_PCT) {
    score -= 15;
    reasons.push("Most events are coming from one project.");
  }

  if (eventsToday === 0 && checkTodayActivity) {
    score -= 20;
    reasons.push("No events received today.");
  }

  if (comparisonDirection === "down") {
    const dropPct = Math.abs(comparisonChangePercent ?? 0);
    score -= dropPct > HEALTH_SEVERE_DROP_PCT ? 25 : 15;
    reasons.push("Event volume dropped compared with the previous period.");
  }

  if (uniqueEventNames <= 1 && scopedTotal > HEALTH_LOW_VARIETY_MIN_EVENTS) {
    score -= 15;
    reasons.push("Event variety is low.");
  }

  if (hasCriticalSpike) {
    score -= 10;
    reasons.push("Unusual event spike detected.");
  }

  score = Math.max(0, Math.min(100, score));

  let status: HealthStatus;
  if (score === 0) status = "inactive";
  else if (score >= 80) status = "healthy";
  else if (score >= 50) status = "watch";
  else status = "risk";

  return { score, status, reasons };
}

interface ProductStat {
  projectId: string;
  projectName: string;
  productId: string;
  productName: string | null;
  viewSessions: number;
  cartSessions: number;
  sessionsThatPurchased: number;
  viewToPurchasePercent: number | null;
  cartToPurchasePercent: number | null;
  unitsAddedToCart: number;
  gmv: number | null;
  currency: string | null;
}

interface CategoryStat {
  projectId: string;
  projectName: string;
  category: string;
  viewSessions: number;
  cartSessions: number;
  sessionsThatPurchased: number;
  viewToPurchasePercent: number | null;
  cartToPurchasePercent: number | null;
  unitsAddedToCart: number;
  gmv: number | null;
  currency: string | null;
}

interface ProductPerformance {
  hasProductData: boolean;
  products: ProductStat[];
  highViewLowPurchase: ProductStat[];
  highCartLowPurchase: ProductStat[];
  categories: CategoryStat[];
}

function buildProductPerformance(params: {
  productRows: ProductPerformanceRow[];
  categoryRows: CategoryPerformanceRow[];
}): ProductPerformance {
  const products: ProductStat[] = params.productRows.map((row) => {
    const viewSessions = toCount(row.viewSessions);
    const cartSessions = toCount(row.cartSessions);
    const viewPurchaseSessions = toCount(row.viewPurchaseSessions);
    const cartPurchaseSessions = toCount(row.cartPurchaseSessions);

    return {
      projectId: row.projectId,
      projectName: row.projectName,
      productId: row.productId,
      productName: row.productName,
      viewSessions,
      cartSessions,
      sessionsThatPurchased: toCount(row.sessionsThatPurchased),
      viewToPurchasePercent: percentOrNull(
        viewPurchaseSessions,
        viewSessions,
      ),
      cartToPurchasePercent: percentOrNull(
        cartPurchaseSessions,
        cartSessions,
      ),
      unitsAddedToCart: Number(row.unitsAddedToCart ?? 0),
      gmv: row.gmv === null ? null : Number(row.gmv),
      currency: row.currency,
    };
  });

  const categories: CategoryStat[] = params.categoryRows.map((row) => {
    const viewSessions = toCount(row.viewSessions);
    const cartSessions = toCount(row.cartSessions);
    const viewPurchaseSessions = toCount(row.viewPurchaseSessions);
    const cartPurchaseSessions = toCount(row.cartPurchaseSessions);

    return {
      projectId: row.projectId,
      projectName: row.projectName,
      category: row.category,
      viewSessions,
      cartSessions,
      sessionsThatPurchased: toCount(row.sessionsThatPurchased),
      viewToPurchasePercent: percentOrNull(
        viewPurchaseSessions,
        viewSessions,
      ),
      cartToPurchasePercent: percentOrNull(
        cartPurchaseSessions,
        cartSessions,
      ),
      unitsAddedToCart: Number(row.unitsAddedToCart ?? 0),
      gmv: row.gmv === null ? null : Number(row.gmv),
      currency: row.currency,
    };
  });

  return {
    hasProductData: products.length > 0,
    products,
    highViewLowPurchase: products
      .filter(
        (product) =>
          product.viewSessions >= 20 &&
          product.viewToPurchasePercent !== null &&
          product.viewToPurchasePercent < 5,
      )
      .sort((a, b) => b.viewSessions - a.viewSessions)
      .slice(0, 6),
    highCartLowPurchase: products
      .filter(
        (product) =>
          product.cartSessions >= 10 &&
          product.cartToPurchasePercent !== null &&
          product.cartToPurchasePercent < 30,
      )
      .sort((a, b) => b.cartSessions - a.cartSessions)
      .slice(0, 6),
    categories,
  };
}

function buildInsights(params: {
  scopedTotal: number;
  projectId: string | null;
  periodComparison: PeriodComparisonCounts;
  trendPoints: TrendPoint[];
  topEvents: TopEvent[];
  eventsByProject: ProjectEventCount[];
  activeProjectsWithEvents: number;
  totalActiveProjects: number | null;
}): AnalyticsInsight[] {
  const {
    scopedTotal,
    projectId,
    periodComparison,
    trendPoints,
    topEvents,
    eventsByProject,
    activeProjectsWithEvents,
    totalActiveProjects,
  } = params;

  // No data at all in this scope — every other insight would be meaningless,
  // so this is the only insight returned.
  if (scopedTotal === 0) {
    return [
      {
        id: "no-data",
        type: "info",
        severity: "info",
        title: "No events in this scope",
        description: "Try a wider time range or check your API key integration.",
      },
    ];
  }

  const insights: AnalyticsInsight[] = [];

  // Growth / drop — current period vs the equivalent previous period.
  const current = periodComparison.current;
  const previous = periodComparison.previous;
  if (previous === 0 && current > 0) {
    insights.push({
      id: "growth-new",
      type: "growth",
      severity: "info",
      title: "Event volume increased",
      description:
        "Events started flowing in this period — there were none in the previous period.",
      metricLabel: "Recent events",
      metricValue: current,
    });
  } else if (previous > 0) {
    const pctChange = ((current - previous) / previous) * 100;
    if (pctChange >= GROWTH_THRESHOLD_PCT) {
      const pct = Math.round(pctChange);
      insights.push({
        id: "growth",
        type: "growth",
        severity: "info",
        title: "Event volume increased",
        description: `Events are up ${pct}% compared with the previous period.`,
        metricLabel: "Change",
        metricValue: `+${pct}%`,
      });
    } else if (pctChange <= -DROP_THRESHOLD_PCT) {
      const pct = Math.round(Math.abs(pctChange));
      insights.push({
        id: "drop",
        type: "drop",
        severity: pct >= CRITICAL_DROP_PCT ? "critical" : "warning",
        title: "Event volume dropped",
        description: `Events are down ${pct}% compared with the previous period.`,
        metricLabel: "Change",
        metricValue: `-${pct}%`,
      });
    }
  }

  // Anomaly — one trend bucket far above the average bucket. Needs a few
  // buckets to establish a meaningful baseline.
  if (trendPoints.length >= 4) {
    const total = trendPoints.reduce((sum, p) => sum + p.count, 0);
    const avg = total / trendPoints.length;
    const peak = Math.max(...trendPoints.map((p) => p.count));
    if (avg > 0 && peak / avg >= ANOMALY_RATIO_THRESHOLD) {
      const ratio = Math.round((peak / avg) * 10) / 10;
      insights.push({
        id: "anomaly",
        type: "spike",
        severity: ratio >= CRITICAL_ANOMALY_RATIO ? "critical" : "warning",
        title: "Unusual spike detected",
        description: `Peak bucket is ${ratio}x higher than the average bucket.`,
        metricLabel: "Peak vs avg",
        metricValue: `${ratio}x`,
      });
    }
  }

  // Dominant event — one event name accounts for most of the scoped total.
  const topEvent = topEvents[0];
  if (topEvent && topEvent.percentage > DOMINANCE_THRESHOLD_PCT) {
    insights.push({
      id: "dominant-event",
      type: "dominant_event",
      severity: "warning",
      title: "One event is dominating activity",
      description: `"${topEvent.name}" represents ${topEvent.percentage}% of all events in the selected scope.`,
      metricLabel: topEvent.name,
      metricValue: `${topEvent.percentage}%`,
    });
  }

  // Project-level insights only make sense across multiple projects.
  if (!projectId) {
    const topProject = eventsByProject[0];
    if (
      topProject &&
      eventsByProject.length > 1 &&
      topProject.percentage > DOMINANCE_THRESHOLD_PCT
    ) {
      insights.push({
        id: "project-hotspot",
        type: "project_hotspot",
        severity: "warning",
        title: `${topProject.projectName} is driving most activity`,
        description: `This project generated ${topProject.percentage}% of events in this period.`,
        metricLabel: topProject.projectName,
        metricValue: `${topProject.percentage}%`,
      });
    }

    if (totalActiveProjects !== null) {
      const inactiveCount = Math.max(
        0,
        totalActiveProjects - activeProjectsWithEvents,
      );
      if (inactiveCount > 0) {
        insights.push({
          id: "inactive-projects",
          type: "inactive",
          severity: "warning",
          title: "Some projects are inactive",
          description: `${inactiveCount} active project${
            inactiveCount !== 1 ? "s" : ""
          } did not receive events in this range.`,
          metricLabel: "Inactive projects",
          metricValue: inactiveCount,
        });
      }
    }
  }

  return insights.slice(0, MAX_INSIGHTS);
}

// ---------------------------------------------------------------------------
// GET /api/analytics/summary
// ---------------------------------------------------------------------------

export async function getAnalyticsSummaryController(
  req: AuthRequest,
  res: Response,
) {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const scopeResult = createAnalyticsScope({
      userId: req.user.userId,
      projectId: req.query.projectId,
      range: req.query.range,
      from: req.query.from,
      to: req.query.to,
    });

    if (!scopeResult.valid) {
      return res.status(400).json({
        success: false,
        message: scopeResult.message,
      });
    }

    const scope = scopeResult.value;

    // "All time" trend granularity depends on the real data span (day buckets
    // for up to 60 days of history, monthly beyond that). The span query stays
    // sequential and runs only for the all-time scope, matching prior behavior.
    const allTimeSpanDays = scope.range.isAllTime
      ? await fetchTrendSpanDays(scope)
      : null;
    const trendGranularity = resolveTrendGranularity(scope, allTimeSpanDays);

    const [
      eventActivity,
      trendPoints,
      periodComparison,
      commerceCounts,
      shopperSummary,
      sessionFunnelResult,
      productPerformanceRows,
      categoryPerformanceRows,
    ] = await Promise.all([
      fetchEventActivity(scope),
      fetchTrend(scope, trendGranularity),
      fetchPeriodComparison(scope),
      fetchCommerceCounts(scope),
      fetchShopperSummary(scope),
      fetchSessionFunnel(scope),

      // Product performance: one row per project-scoped product identity.
      // Repeated interactions collapse to one project-scoped session, and a
      // purchase counts only when it happened after that product interaction.
      // GMV stays unavailable in Phase 0A because current purchase events do
      // not reliably distinguish product-level money from order-level money.
      prisma.$queryRaw<ProductPerformanceRow[]>`
        WITH scoped_events AS (
          SELECT
            e.id,
            e."projectId",
            p.name AS "projectName",
            LOWER(e.name) AS name,
            e.properties,
            e."sessionId",
            e."createdAt",
            COALESCE(
              NULLIF(BTRIM(e.properties->>'product_id'), ''),
              NULLIF(BTRIM(e.properties->>'productId'), '')
            ) AS "productId",
            COALESCE(
              NULLIF(BTRIM(e.properties->>'product_name'), ''),
              NULLIF(BTRIM(e.properties->>'productName'), '')
            ) AS "productName",
            CASE
              WHEN (e.properties->>'quantity') ~ '^[0-9]+([.][0-9]+)?$'
                THEN (e.properties->>'quantity')::numeric
              ELSE NULL
            END AS quantity
          FROM "Event" e
          JOIN "Project" p ON p.id = e."projectId"
          WHERE ${scope.sql.currentAliasedEvent}
            AND e."sessionId" IS NOT NULL
        ),
        product_sessions AS (
          SELECT
            "projectId",
            MAX("projectName") AS "projectName",
            "productId",
            "sessionId",
            (
              ARRAY_AGG("productName" ORDER BY "createdAt" DESC, id DESC)
                FILTER (WHERE "productName" IS NOT NULL)
            )[1] AS "productName",
            MAX("createdAt") FILTER (WHERE "productName" IS NOT NULL) AS "metadataAt",
            MIN("createdAt") FILTER (
              WHERE name IN (${Prisma.join([...SESSION_FUNNEL_STEPS[0].aliases])})
            ) AS "firstViewAt",
            MIN("createdAt") FILTER (
              WHERE name IN (${Prisma.join([...SESSION_FUNNEL_STEPS[1].aliases])})
            ) AS "firstCartAt",
            MIN("createdAt") AS "firstInteractionAt",
            SUM(
              CASE
                WHEN name IN (${Prisma.join([...SESSION_FUNNEL_STEPS[1].aliases])})
                  THEN COALESCE(quantity, 1)
                ELSE 0
              END
            ) AS "unitsAddedToCart"
          FROM scoped_events
          WHERE "productId" IS NOT NULL
            AND name IN (${Prisma.join([
              ...SESSION_FUNNEL_STEPS[0].aliases,
              ...SESSION_FUNNEL_STEPS[1].aliases,
            ])})
          GROUP BY "projectId", "productId", "sessionId"
        ),
        purchase_sessions AS (
          SELECT
            "projectId",
            "sessionId",
            MAX("createdAt") AS "lastPurchaseAt"
          FROM scoped_events
          WHERE name IN (${Prisma.join([...SESSION_FUNNEL_STEPS[3].aliases])})
          GROUP BY "projectId", "sessionId"
        )
        SELECT
          ps."projectId",
          MAX(ps."projectName") AS "projectName",
          ps."productId",
          (
            ARRAY_AGG(
              ps."productName"
              ORDER BY ps."metadataAt" DESC NULLS LAST, ps."sessionId" DESC
            ) FILTER (WHERE ps."productName" IS NOT NULL)
          )[1] AS "productName",
          COUNT(*) FILTER (WHERE ps."firstViewAt" IS NOT NULL) AS "viewSessions",
          COUNT(*) FILTER (WHERE ps."firstCartAt" IS NOT NULL) AS "cartSessions",
          COUNT(*) FILTER (
            WHERE p."lastPurchaseAt" > ps."firstInteractionAt"
          ) AS "sessionsThatPurchased",
          COUNT(*) FILTER (
            WHERE ps."firstViewAt" IS NOT NULL
              AND p."lastPurchaseAt" > ps."firstViewAt"
          ) AS "viewPurchaseSessions",
          COUNT(*) FILTER (
            WHERE ps."firstCartAt" IS NOT NULL
              AND p."lastPurchaseAt" > ps."firstCartAt"
          ) AS "cartPurchaseSessions",
          COALESCE(SUM(ps."unitsAddedToCart"), 0) AS "unitsAddedToCart",
          NULL::numeric AS gmv,
          NULL::text AS currency
        FROM product_sessions ps
        LEFT JOIN purchase_sessions p
          ON p."projectId" = ps."projectId"
          AND p."sessionId" = ps."sessionId"
        GROUP BY ps."projectId", ps."productId"
        ORDER BY
          (
            COUNT(*) FILTER (WHERE ps."firstViewAt" IS NOT NULL) +
            COUNT(*) FILTER (WHERE ps."firstCartAt" IS NOT NULL) +
            COUNT(*) FILTER (WHERE p."lastPurchaseAt" > ps."firstInteractionAt")
          ) DESC,
          MAX(ps."projectName") ASC,
          ps."productId" ASC
        LIMIT 15
      `,

      // Category performance follows the same project-scoped, ordered
      // session-outcome attribution as products. Category comes only from
      // view/cart interactions; no purchase event is used to fabricate it.
      prisma.$queryRaw<CategoryPerformanceRow[]>`
        WITH scoped_events AS (
          SELECT
            e.id,
            e."projectId",
            p.name AS "projectName",
            LOWER(e.name) AS name,
            e.properties,
            e."sessionId",
            e."createdAt",
            NULLIF(BTRIM(e.properties->>'category'), '') AS category,
            CASE
              WHEN (e.properties->>'quantity') ~ '^[0-9]+([.][0-9]+)?$'
                THEN (e.properties->>'quantity')::numeric
              ELSE NULL
            END AS quantity
          FROM "Event" e
          JOIN "Project" p ON p.id = e."projectId"
          WHERE ${scope.sql.currentAliasedEvent}
            AND e."sessionId" IS NOT NULL
        ),
        category_sessions AS (
          SELECT
            "projectId",
            MAX("projectName") AS "projectName",
            category,
            "sessionId",
            MIN("createdAt") FILTER (
              WHERE name IN (${Prisma.join([...SESSION_FUNNEL_STEPS[0].aliases])})
            ) AS "firstViewAt",
            MIN("createdAt") FILTER (
              WHERE name IN (${Prisma.join([...SESSION_FUNNEL_STEPS[1].aliases])})
            ) AS "firstCartAt",
            MIN("createdAt") AS "firstInteractionAt",
            SUM(
              CASE
                WHEN name IN (${Prisma.join([...SESSION_FUNNEL_STEPS[1].aliases])})
                  THEN COALESCE(quantity, 1)
                ELSE 0
              END
            ) AS "unitsAddedToCart"
          FROM scoped_events
          WHERE category IS NOT NULL
            AND name IN (${Prisma.join([
              ...SESSION_FUNNEL_STEPS[0].aliases,
              ...SESSION_FUNNEL_STEPS[1].aliases,
            ])})
          GROUP BY "projectId", category, "sessionId"
        ),
        purchase_sessions AS (
          SELECT
            "projectId",
            "sessionId",
            MAX("createdAt") AS "lastPurchaseAt"
          FROM scoped_events
          WHERE name IN (${Prisma.join([...SESSION_FUNNEL_STEPS[3].aliases])})
          GROUP BY "projectId", "sessionId"
        )
        SELECT
          cs."projectId",
          MAX(cs."projectName") AS "projectName",
          cs.category,
          COUNT(*) FILTER (WHERE cs."firstViewAt" IS NOT NULL) AS "viewSessions",
          COUNT(*) FILTER (WHERE cs."firstCartAt" IS NOT NULL) AS "cartSessions",
          COUNT(*) FILTER (
            WHERE p."lastPurchaseAt" > cs."firstInteractionAt"
          ) AS "sessionsThatPurchased",
          COUNT(*) FILTER (
            WHERE cs."firstViewAt" IS NOT NULL
              AND p."lastPurchaseAt" > cs."firstViewAt"
          ) AS "viewPurchaseSessions",
          COUNT(*) FILTER (
            WHERE cs."firstCartAt" IS NOT NULL
              AND p."lastPurchaseAt" > cs."firstCartAt"
          ) AS "cartPurchaseSessions",
          COALESCE(SUM(cs."unitsAddedToCart"), 0) AS "unitsAddedToCart",
          NULL::numeric AS gmv,
          NULL::text AS currency
        FROM category_sessions cs
        LEFT JOIN purchase_sessions p
          ON p."projectId" = cs."projectId"
          AND p."sessionId" = cs."sessionId"
        GROUP BY cs."projectId", cs.category
        ORDER BY
          (
            COUNT(*) FILTER (WHERE cs."firstViewAt" IS NOT NULL) +
            COUNT(*) FILTER (WHERE cs."firstCartAt" IS NOT NULL) +
            COUNT(*) FILTER (WHERE p."lastPurchaseAt" > cs."firstInteractionAt")
          ) DESC,
          MAX(cs."projectName") ASC,
          cs.category ASC
        LIMIT 8
      `,
    ]);

    const scopedTotal = eventActivity.totalEvents;

    // Average events per day across the scoped window.
    let avgEventsPerDay = 0;
    if (scopedTotal > 0) {
      const days = scope.range.dayCount ?? Math.max(1, trendPoints.length);
      avgEventsPerDay = roundPct(scopedTotal / days);
    }

    const mappedTrendPoints = trendPoints;
    const mappedTopEvents = eventActivity.topEvents;
    const mappedEventsByProject = eventActivity.eventsByProject;

    const insights = buildInsights({
      scopedTotal,
      projectId: scope.projectId,
      periodComparison,
      trendPoints: mappedTrendPoints,
      topEvents: mappedTopEvents,
      eventsByProject: mappedEventsByProject,
      activeProjectsWithEvents: eventActivity.activeProjects,
      totalActiveProjects: eventActivity.totalActiveProjects,
    });

    const comparison = buildComparison(periodComparison, scope.comparison.label);

    const health = buildHealth({
      scopedTotal,
      eventsToday: eventActivity.eventsToday,
      uniqueEventNames: eventActivity.uniqueEventNames,
      checkTodayActivity: scope.checkTodayActivity,
      projectId: scope.projectId,
      topEvent: mappedTopEvents[0],
      topProject: mappedEventsByProject[0],
      comparisonDirection: comparison.direction,
      comparisonChangePercent: comparison.changePercent,
      hasCriticalSpike: insights.some(
        (i) => i.type === "spike" && i.severity === "critical",
      ),
    });

    const commerceFunnel = buildCommerceFunnel(commerceCounts);
    const sessionFunnel = buildSessionFunnel(sessionFunnelResult);
    const productPerformance = buildProductPerformance({
      productRows: productPerformanceRows,
      categoryRows: categoryPerformanceRows,
    });

    return res.json({
      success: true,
      data: {
        summary: {
          totalEvents: scopedTotal,
          eventsToday: eventActivity.eventsToday,
          uniqueEventNames: eventActivity.uniqueEventNames,
          activeProjects: eventActivity.activeProjects,
          avgEventsPerDay,
        },
        trend: {
          granularity: trendGranularity ?? "day",
          points: mappedTrendPoints,
        },
        topEvents: mappedTopEvents,
        eventsByProject: mappedEventsByProject,
        recentActivity: eventActivity.recentActivity,
        topProperties: eventActivity.topProperties,
        insights,
        comparison,
        health,
        commerceFunnel,
        sessionFunnel,
        productPerformance,
        shopperSummary,
      },
    });
  } catch (error) {
    console.error("[getAnalyticsSummary]", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
}
