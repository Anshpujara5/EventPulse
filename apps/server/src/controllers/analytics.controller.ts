import { Prisma } from "@prisma/client";
import type { Response } from "express";
import { prisma } from "../config/prisma";
import type { AuthRequest } from "../middleware/auth.middleware";
import { rangeToInterval, type TimeRangeToken } from "../utils/timeRange";

// ---------------------------------------------------------------------------
// Row types for typed raw queries
// ---------------------------------------------------------------------------

interface CountRow {
  count: bigint;
}

interface TopEventRow {
  name: string;
  count: bigint;
}

interface ProjectEventRow {
  projectId: string;
  projectName: string;
  count: bigint;
}

interface TrendPointRow {
  bucket: string;
  count: bigint;
}

interface RecentEventRow {
  id: string;
  name: string;
  projectName: string;
  createdAt: Date;
}

interface PropertyKeyRow {
  key: string;
  count: bigint;
}

interface SpanRow {
  spanDays: number | null;
}

interface PeriodComparisonRow {
  current: bigint;
  previous: bigint;
}

type TrendGranularity = "hour" | "day" | "month";

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

// Period-over-period comparison window per range token — "all time" compares
// the most recent 7 days against the 7 days before that, since there's no
// natural fixed window to compare against otherwise.
const PERIOD_COMPARISON_LOOKBACK: Record<
  TimeRangeToken,
  { current: string; previous: string }
> = {
  "24h": { current: "24 hours", previous: "48 hours" },
  "7d": { current: "7 days", previous: "14 days" },
  "30d": { current: "30 days", previous: "60 days" },
  all: { current: "7 days", previous: "14 days" },
};

// Matches the windows above — used for the "Previous Period" comparison label.
const PERIOD_COMPARISON_LABEL: Record<TimeRangeToken, string> = {
  "24h": "previous 24 hours",
  "7d": "previous 7 days",
  "30d": "previous 30 days",
  all: "previous 7 days",
};

const FLAT_CHANGE_THRESHOLD_PCT = 5;

type ComparisonDirection = "up" | "down" | "flat" | "new" | "no_data";

function buildComparison(
  periodComparison: PeriodComparisonRow | undefined,
  rangeToken: TimeRangeToken,
) {
  const currentPeriodEvents = Number(periodComparison?.current ?? 0);
  const previousPeriodEvents = Number(periodComparison?.previous ?? 0);

  let changePercent: number | null = null;
  let direction: ComparisonDirection;

  if (currentPeriodEvents === 0 && previousPeriodEvents === 0) {
    direction = "no_data";
  } else if (previousPeriodEvents === 0) {
    direction = "new";
  } else {
    const pct =
      ((currentPeriodEvents - previousPeriodEvents) / previousPeriodEvents) * 100;
    changePercent = Math.round(pct * 10) / 10;
    direction =
      Math.abs(pct) < FLAT_CHANGE_THRESHOLD_PCT ? "flat" : pct > 0 ? "up" : "down";
  }

  return {
    currentPeriodEvents,
    previousPeriodEvents,
    changePercent,
    direction,
    label: `Compared with ${PERIOD_COMPARISON_LABEL[rangeToken]}`,
  };
}

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
  rangeToken: TimeRangeToken;
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
    rangeToken,
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

  if (eventsToday === 0 && rangeToken !== "all") {
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

// ---------------------------------------------------------------------------
// Commerce conversion funnel — aggregate event-name counts only.
//
// Event.userId is the account owner, NOT the shopper/visitor, and there is no
// session id on events yet. So this deliberately reports honest aggregate
// volumes per funnel stage; it does not (and must not) pretend to follow
// individual shoppers through the journey. True shopper-level funnels need a
// sessionId/visitor id on Event — a later, migration-requiring task.
// ---------------------------------------------------------------------------

type CommerceStepId =
  | "product_viewed"
  | "add_to_cart"
  | "checkout_started"
  | "purchase_completed";

interface CommerceFunnelStep {
  id: CommerceStepId;
  label: string;
  count: number;
  conversionFromFirstPercent: number | null;
  conversionFromPreviousPercent: number | null;
  dropOffFromPreviousPercent: number | null;
}

interface CommerceFriction {
  paymentFailed: number;
  outOfStock: number;
  itemUnavailable: number;
  deliveryFeeShown: number;
  etaShown: number;
  couponApplied: number;
}

interface CommerceFunnelInsight {
  type:
    | "healthy"
    | "view_to_cart_drop"
    | "cart_to_checkout_drop"
    | "checkout_to_purchase_drop"
    | "missing_top_of_funnel"
    | "no_commerce_events";
  severity: "info" | "warning" | "critical";
  title: string;
  description: string;
}

interface CommerceFunnel {
  label: string;
  totalCommerceEvents: number;
  // Funnel-step events + friction events — see comment at its computation.
  commerceSignalEvents: number;
  steps: CommerceFunnelStep[];
  friction: CommerceFriction;
  insight: CommerceFunnelInsight;
}

// Canonical lowercase aliases per funnel stage. Matching is case-insensitive:
// names are lowered in SQL before comparing against these.
const COMMERCE_STEPS: {
  id: CommerceStepId;
  label: string;
  aliases: readonly string[];
}[] = [
  {
    id: "product_viewed",
    label: "Product Viewed",
    aliases: [
      "product_viewed",
      "product_view",
      "view_product",
      "product_detail_viewed",
      "product.opened",
    ],
  },
  {
    id: "add_to_cart",
    label: "Added to Cart",
    aliases: ["add_to_cart", "added_to_cart", "cart_added", "item_added_to_cart"],
  },
  {
    id: "checkout_started",
    label: "Checkout Started",
    aliases: [
      "checkout_started",
      "start_checkout",
      "checkout_initiated",
      "begin_checkout",
    ],
  },
  {
    id: "purchase_completed",
    label: "Purchase Completed",
    // "checkout.completed" (dot form) is included because it's the example
    // name used in our own developer docs.
    aliases: [
      "payment_completed",
      "purchase_completed",
      "order_completed",
      "checkout_completed",
      "checkout.completed",
      "order_placed",
    ],
  },
];

const COMMERCE_FRICTION_ALIASES: Record<keyof CommerceFriction, readonly string[]> = {
  paymentFailed: ["payment_failed"],
  outOfStock: ["item_out_of_stock"],
  itemUnavailable: ["item_unavailable"],
  deliveryFeeShown: ["delivery_fee_shown"],
  etaShown: ["eta_shown"],
  couponApplied: ["coupon_applied"],
};

const ALL_COMMERCE_ALIASES: string[] = [
  ...COMMERCE_STEPS.flatMap((step) => [...step.aliases]),
  ...Object.values(COMMERCE_FRICTION_ALIASES).flat(),
];

const VIEW_TO_CART_DROP_THRESHOLD_PCT = 70;
const CART_TO_CHECKOUT_DROP_THRESHOLD_PCT = 60;
const CHECKOUT_TO_PURCHASE_DROP_THRESHOLD_PCT = 50;

function roundPct(value: number): number {
  return Math.round(value * 10) / 10;
}

function buildCommerceFunnel(countsByName: Map<string, number>): CommerceFunnel {
  const countFor = (aliases: readonly string[]): number =>
    aliases.reduce((sum, alias) => sum + (countsByName.get(alias) ?? 0), 0);

  const rawCounts = COMMERCE_STEPS.map((step) => countFor(step.aliases));
  const firstCount = rawCounts[0] ?? 0;
  const totalCommerceEvents = rawCounts.reduce((sum, count) => sum + count, 0);

  const steps: CommerceFunnelStep[] = COMMERCE_STEPS.map((step, index) => {
    const count = rawCounts[index] ?? 0;

    // Without any product views there is no funnel baseline — every
    // percentage is null rather than a made-up number.
    if (firstCount === 0) {
      return {
        id: step.id,
        label: step.label,
        count,
        conversionFromFirstPercent: null,
        conversionFromPreviousPercent: null,
        dropOffFromPreviousPercent: null,
      };
    }

    if (index === 0) {
      return {
        id: step.id,
        label: step.label,
        count,
        conversionFromFirstPercent: 100,
        conversionFromPreviousPercent: null,
        dropOffFromPreviousPercent: null,
      };
    }

    const previousCount = rawCounts[index - 1] ?? 0;
    const conversionFromPreviousPercent =
      previousCount > 0 ? roundPct((count / previousCount) * 100) : null;

    return {
      id: step.id,
      label: step.label,
      count,
      conversionFromFirstPercent: roundPct((count / firstCount) * 100),
      conversionFromPreviousPercent,
      dropOffFromPreviousPercent:
        conversionFromPreviousPercent !== null
          ? roundPct(100 - conversionFromPreviousPercent)
          : null,
    };
  });

  const friction: CommerceFriction = {
    paymentFailed: countFor(COMMERCE_FRICTION_ALIASES.paymentFailed),
    outOfStock: countFor(COMMERCE_FRICTION_ALIASES.outOfStock),
    itemUnavailable: countFor(COMMERCE_FRICTION_ALIASES.itemUnavailable),
    deliveryFeeShown: countFor(COMMERCE_FRICTION_ALIASES.deliveryFeeShown),
    etaShown: countFor(COMMERCE_FRICTION_ALIASES.etaShown),
    couponApplied: countFor(COMMERCE_FRICTION_ALIASES.couponApplied),
  };

  // Funnel-step events plus friction events — used to decide whether *any*
  // commerce signal exists in this scope, so a friction-only scope (e.g. only
  // payment_failed events, no funnel steps) isn't reported as "no commerce
  // events" just because it has no funnel-step events.
  const frictionTotal = Object.values(friction).reduce((sum, c) => sum + c, 0);
  const commerceSignalEvents = totalCommerceEvents + frictionTotal;

  const viewToCartDrop = steps[1]?.dropOffFromPreviousPercent ?? null;
  const cartToCheckoutDrop = steps[2]?.dropOffFromPreviousPercent ?? null;
  const checkoutToPurchaseDrop = steps[3]?.dropOffFromPreviousPercent ?? null;

  let insight: CommerceFunnelInsight;
  if (commerceSignalEvents === 0) {
    insight = {
      type: "no_commerce_events",
      severity: "info",
      title: "No commerce funnel events",
      description:
        "No commerce funnel events were received in this scope yet.",
    };
  } else if (firstCount === 0) {
    // Commerce events exist, but the top of the funnel (product_viewed) is
    // missing — so we can't compute conversion. Real counts still show below.
    insight = {
      type: "missing_top_of_funnel",
      severity: "warning",
      title: "Missing product view tracking",
      description:
        "Commerce events were received, but product_viewed events are missing. Add product_viewed tracking to measure the full shopper journey.",
    };
  } else if (
    viewToCartDrop !== null &&
    viewToCartDrop > VIEW_TO_CART_DROP_THRESHOLD_PCT
  ) {
    insight = {
      type: "view_to_cart_drop",
      severity: "warning",
      title: "Shoppers view products but rarely add to cart",
      description: `${viewToCartDrop}% of product views do not turn into add-to-cart events in this scope.`,
    };
  } else if (
    cartToCheckoutDrop !== null &&
    cartToCheckoutDrop > CART_TO_CHECKOUT_DROP_THRESHOLD_PCT
  ) {
    insight = {
      type: "cart_to_checkout_drop",
      severity: "warning",
      title: "Carts are not reaching checkout",
      description: `${cartToCheckoutDrop}% of add-to-cart events do not lead to a started checkout in this scope.`,
    };
  } else if (
    checkoutToPurchaseDrop !== null &&
    checkoutToPurchaseDrop > CHECKOUT_TO_PURCHASE_DROP_THRESHOLD_PCT
  ) {
    insight = {
      type: "checkout_to_purchase_drop",
      severity: "critical",
      title: "Checkouts are not converting into purchases",
      description: `${checkoutToPurchaseDrop}% of started checkouts do not end in a completed purchase in this scope.`,
    };
  } else {
    insight = {
      type: "healthy",
      severity: "info",
      title: "Funnel looks healthy",
      description:
        "No unusual drop-off detected between funnel steps in this scope.",
    };
  }

  return {
    label: "Product Viewed → Purchase Completed",
    totalCommerceEvents,
    commerceSignalEvents,
    steps,
    friction,
    insight,
  };
}

// ---------------------------------------------------------------------------
// Trend bucketing.
//
// "createdAt" is stored as a naive `timestamp` column (see schema.prisma) —
// its digits are whatever wall-clock the database session's TimeZone setting
// produces when NOW() is cast down on insert (see event.controller.ts). Every
// other query in this file (CURRENT_DATE, NOW() - interval, etc.) already
// relies on that same session-timezone convention implicitly. Trend bucketing
// does the same: all truncation/window math happens in SQL via date_trunc()
// and NOW(), so it stays consistent with those queries. It deliberately does
// NOT use `AT TIME ZONE` to reinterpret createdAt — that would treat the
// session-local digits as UTC and shift real events into the wrong bucket
// (or out of the window entirely) whenever the DB session isn't UTC.
// ---------------------------------------------------------------------------

const ALL_TIME_MONTHLY_THRESHOLD_DAYS = 60;

interface FixedRangeSpec {
  granularity: TrendGranularity;
  lookback: string; // interval literal, bound as a parameter
  step: string; // interval literal, bound as a parameter
}

const FIXED_RANGE_SPECS: Record<Exclude<TimeRangeToken, "all">, FixedRangeSpec> = {
  "24h": { granularity: "hour", lookback: "23 hours", step: "1 hour" },
  "7d": { granularity: "day", lookback: "6 days", step: "1 day" },
  "30d": { granularity: "day", lookback: "29 days", step: "1 day" },
};

function buildInsights(params: {
  scopedTotal: number;
  projectId: string | null;
  periodComparison: PeriodComparisonRow | undefined;
  trendPoints: { date: string; count: number }[];
  topEvents: { name: string; count: number; percentage: number }[];
  eventsByProject: {
    projectId: string;
    projectName: string;
    count: number;
    percentage: number;
  }[];
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
  const current = Number(periodComparison?.current ?? 0);
  const previous = Number(periodComparison?.previous ?? 0);
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

    const userId = req.user.userId;

    // Optional project scope from the header project selector. Uses parameterised
    // Prisma SQL fragments (never string concatenation) so it stays injection-safe.
    const projectId =
      typeof req.query.projectId === "string" && req.query.projectId
        ? req.query.projectId
        : null;
    const projFilter = projectId
      ? Prisma.sql`AND "projectId" = ${projectId}`
      : Prisma.empty;
    const projFilterE = projectId
      ? Prisma.sql`AND e."projectId" = ${projectId}`
      : Prisma.empty;

    // Optional time-range scope from the header time-range selector. Scopes the
    // summary total, unique-name count, active-project count, and every
    // breakdown below. "Events today" stays a fixed since-midnight window
    // regardless of range, matching how the events page treats "today".
    const rangeToken: TimeRangeToken =
      req.query.range === "24h" ||
      req.query.range === "7d" ||
      req.query.range === "30d"
        ? req.query.range
        : "all";
    const rangeInterval = rangeToInterval(rangeToken);
    const rangeFilter = rangeInterval
      ? Prisma.sql`AND "createdAt" >= NOW() - ${rangeInterval}::interval`
      : Prisma.empty;
    const rangeFilterE = rangeInterval
      ? Prisma.sql`AND e."createdAt" >= NOW() - ${rangeInterval}::interval`
      : Prisma.empty;

    // "All time" trend granularity depends on the real data span (day buckets
    // for up to 60 days of history, monthly beyond that). Measured in whole
    // calendar days via a plain date subtraction so it's not affected by
    // client/server timezone parsing.
    let allTimeGranularity: TrendGranularity | null = null;
    if (rangeToken === "all") {
      const [spanRow] = await prisma.$queryRaw<SpanRow[]>`
        SELECT (CURRENT_DATE - MIN("createdAt")::date) AS "spanDays"
        FROM "Event"
        WHERE "userId" = ${userId}
        ${projFilter}
      `;
      if (spanRow?.spanDays !== null && spanRow?.spanDays !== undefined) {
        allTimeGranularity =
          spanRow.spanDays <= ALL_TIME_MONTHLY_THRESHOLD_DAYS ? "day" : "month";
      }
    }

    const trendGranularity: TrendGranularity | null =
      rangeToken === "all" ? allTimeGranularity : FIXED_RANGE_SPECS[rangeToken].granularity;

    function buildTrendQuery() {
      if (rangeToken === "all") {
        if (!allTimeGranularity) {
          return Promise.resolve([] as TrendPointRow[]);
        }
        const step = allTimeGranularity === "day" ? "1 day" : "1 month";
        return prisma.$queryRaw<TrendPointRow[]>`
          WITH bounds AS (
            SELECT
              date_trunc(${allTimeGranularity}, MIN("createdAt")) AS "start",
              date_trunc(${allTimeGranularity}, NOW()) AS "end"
            FROM "Event"
            WHERE "userId" = ${userId}
            ${projFilter}
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
            AND e."userId" = ${userId}
            ${projFilterE}
          GROUP BY b.bucket
          ORDER BY b.bucket ASC
        `;
      }

      const spec = FIXED_RANGE_SPECS[rangeToken];
      return prisma.$queryRaw<TrendPointRow[]>`
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
          AND e."userId" = ${userId}
          ${projFilterE}
        GROUP BY b.bucket
        ORDER BY b.bucket ASC
      `;
    }

    const periodLookback = PERIOD_COMPARISON_LOOKBACK[rangeToken];

    const [
      totalResult,
      todayResult,
      uniqueNamesResult,
      activeProjectsResult,
      topEvents,
      eventsByProject,
      recentActivity,
      topProperties,
      trendPoints,
      periodComparison,
      totalActiveProjectsResult,
      commerceCountRows,
    ] = await Promise.all([
      // Total events matching the current project + range scope
      prisma.$queryRaw<CountRow[]>`
        SELECT COUNT(*) AS count
        FROM "Event"
        WHERE "userId" = ${userId}
        ${projFilter}
        ${rangeFilter}
      `,

      // Events today (since midnight, DB session timezone) — fixed window,
      // not affected by range, matching the events page's own "today".
      prisma.$queryRaw<CountRow[]>`
        SELECT COUNT(*) AS count
        FROM "Event"
        WHERE "userId" = ${userId}
          AND "createdAt" >= CURRENT_DATE
        ${projFilter}
      `,

      // Unique event names within the current scope
      prisma.$queryRaw<CountRow[]>`
        SELECT COUNT(DISTINCT name) AS count
        FROM "Event"
        WHERE "userId" = ${userId}
        ${projFilter}
        ${rangeFilter}
      `,

      // Distinct projects with events within the current scope
      prisma.$queryRaw<CountRow[]>`
        SELECT COUNT(DISTINCT "projectId") AS count
        FROM "Event"
        WHERE "userId" = ${userId}
        ${projFilter}
        ${rangeFilter}
      `,

      // Top 10 event names by count
      prisma.$queryRaw<TopEventRow[]>`
        SELECT name, COUNT(*) AS count
        FROM "Event"
        WHERE "userId" = ${userId}
        ${projFilter}
        ${rangeFilter}
        GROUP BY name
        ORDER BY count DESC
        LIMIT 10
      `,

      // Event counts per project (join to get name)
      prisma.$queryRaw<ProjectEventRow[]>`
        SELECT e."projectId", p.name AS "projectName", COUNT(*) AS count
        FROM "Event" e
        JOIN "Project" p ON p.id = e."projectId"
        WHERE e."userId" = ${userId}
        ${projFilterE}
        ${rangeFilterE}
        GROUP BY e."projectId", p.name
        ORDER BY count DESC
        LIMIT 10
      `,

      // 10 most recent events with project name
      prisma.$queryRaw<RecentEventRow[]>`
        SELECT e.id, e.name, p.name AS "projectName", e."createdAt"
        FROM "Event" e
        JOIN "Project" p ON p.id = e."projectId"
        WHERE e."userId" = ${userId}
        ${projFilterE}
        ${rangeFilterE}
        ORDER BY e."createdAt" DESC
        LIMIT 10
      `,

      // Top-level property keys used across events (no nested traversal —
      // just the top-level jsonb keys, kept simple on purpose)
      prisma.$queryRaw<PropertyKeyRow[]>`
        SELECT key, COUNT(*) AS count
        FROM "Event" e, jsonb_object_keys(e.properties) AS key
        WHERE e."userId" = ${userId}
        ${projFilterE}
        ${rangeFilterE}
        GROUP BY key
        ORDER BY count DESC
        LIMIT 10
      `,

      // Continuous, zero-filled trend buckets for the planned window/granularity
      buildTrendQuery(),

      // Current vs previous period totals, for growth/drop insights
      prisma.$queryRaw<PeriodComparisonRow[]>`
        SELECT
          COUNT(*) FILTER (WHERE "createdAt" >= NOW() - ${periodLookback.current}::interval) AS current,
          COUNT(*) FILTER (
            WHERE "createdAt" >= NOW() - ${periodLookback.previous}::interval
              AND "createdAt" < NOW() - ${periodLookback.current}::interval
          ) AS previous
        FROM "Event"
        WHERE "userId" = ${userId}
        ${projFilter}
      `,

      // Total ACTIVE projects owned by the user, for the inactive-project
      // insight. Only meaningful for the all-projects scope.
      projectId
        ? Promise.resolve([] as CountRow[])
        : prisma.$queryRaw<CountRow[]>`
            SELECT COUNT(*) AS count
            FROM "Project"
            WHERE "userId" = ${userId} AND status = 'ACTIVE'
          `,

      // Commerce funnel + friction counts, grouped by lowered event name so
      // alias matching is case-insensitive. Same project/range scope as the
      // rest of analytics; alias list is bound as parameters via Prisma.join.
      prisma.$queryRaw<TopEventRow[]>`
        SELECT LOWER(name) AS name, COUNT(*) AS count
        FROM "Event"
        WHERE "userId" = ${userId}
        ${projFilter}
        ${rangeFilter}
        AND LOWER(name) IN (${Prisma.join(ALL_COMMERCE_ALIASES)})
        GROUP BY LOWER(name)
      `,
    ]);

    const scopedTotal = Number(totalResult[0]?.count ?? 0);

    function percentageOf(count: number): number {
      return scopedTotal > 0 ? Math.round((count / scopedTotal) * 1000) / 10 : 0;
    }

    // Average events per day across the scoped window.
    let avgEventsPerDay = 0;
    if (scopedTotal > 0) {
      let days: number;
      if (rangeToken === "24h") days = 1;
      else if (rangeToken === "7d") days = 7;
      else if (rangeToken === "30d") days = 30;
      else days = Math.max(1, trendPoints.length);
      avgEventsPerDay = Math.round((scopedTotal / days) * 10) / 10;
    }

    const mappedTrendPoints = trendPoints.map((r) => ({
      date: r.bucket,
      count: Number(r.count),
    }));
    const mappedTopEvents = topEvents.map((r) => ({
      name: r.name,
      count: Number(r.count),
      percentage: percentageOf(Number(r.count)),
    }));
    const mappedEventsByProject = eventsByProject.map((r) => ({
      projectId: r.projectId,
      projectName: r.projectName,
      count: Number(r.count),
      percentage: percentageOf(Number(r.count)),
    }));

    const insights = buildInsights({
      scopedTotal,
      projectId,
      periodComparison: periodComparison[0],
      trendPoints: mappedTrendPoints,
      topEvents: mappedTopEvents,
      eventsByProject: mappedEventsByProject,
      activeProjectsWithEvents: Number(activeProjectsResult[0]?.count ?? 0),
      totalActiveProjects: projectId
        ? null
        : Number(totalActiveProjectsResult[0]?.count ?? 0),
    });

    const comparison = buildComparison(periodComparison[0], rangeToken);

    const health = buildHealth({
      scopedTotal,
      eventsToday: Number(todayResult[0]?.count ?? 0),
      uniqueEventNames: Number(uniqueNamesResult[0]?.count ?? 0),
      rangeToken,
      projectId,
      topEvent: mappedTopEvents[0],
      topProject: mappedEventsByProject[0],
      comparisonDirection: comparison.direction,
      comparisonChangePercent: comparison.changePercent,
      hasCriticalSpike: insights.some(
        (i) => i.type === "spike" && i.severity === "critical",
      ),
    });

    const commerceCounts = new Map<string, number>();
    for (const row of commerceCountRows) {
      commerceCounts.set(row.name, Number(row.count));
    }
    const commerceFunnel = buildCommerceFunnel(commerceCounts);

    return res.json({
      success: true,
      data: {
        summary: {
          totalEvents: scopedTotal,
          eventsToday: Number(todayResult[0]?.count ?? 0),
          uniqueEventNames: Number(uniqueNamesResult[0]?.count ?? 0),
          activeProjects: Number(activeProjectsResult[0]?.count ?? 0),
          avgEventsPerDay,
        },
        trend: {
          granularity: trendGranularity ?? "day",
          points: mappedTrendPoints,
        },
        topEvents: mappedTopEvents,
        eventsByProject: mappedEventsByProject,
        recentActivity: recentActivity.map((r) => ({
          id: r.id,
          name: r.name,
          projectName: r.projectName,
          createdAt: r.createdAt,
        })),
        topProperties: topProperties.map((r) => ({
          key: r.key,
          count: Number(r.count),
        })),
        insights,
        comparison,
        health,
        commerceFunnel,
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
