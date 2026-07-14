import type { AnalyticsScope } from "./analyticsScope";
import {
  buildCommerceFunnel,
  fetchCommerceCounts,
  type CommerceFunnel,
} from "./commerceFunnel";
import {
  buildComparison,
  fetchPeriodComparison,
  type PeriodComparison,
  type PeriodComparisonCounts,
} from "./comparison";
import {
  fetchEventActivity,
  type EventActivityResult,
  type ProjectEventCount,
  type RecentEvent,
  type TopEvent,
  type TopProperty,
} from "./eventActivity";
import {
  buildHealth,
  buildInsights,
  type AnalyticsHealth,
  type AnalyticsInsight,
} from "./healthInsights";
import {
  buildProductPerformance,
  fetchCategoryPerformanceRows,
  fetchProductPerformanceRows,
  type ProductPerformance,
} from "./productPerformance";
import {
  buildSessionFunnel,
  fetchSessionFunnel,
  type SessionFunnel,
} from "./sessionFunnel";
import { fetchShopperSummary, type ShopperSummary } from "./shopperSummary";
import { roundPct } from "./shared/numbers";
import {
  fetchTrend,
  fetchTrendSpanDays,
  resolveTrendGranularity,
  type EventTrend,
  type TrendGranularity,
  type TrendPoint,
} from "./trend";

export type AnalyticsTab =
  | "overview"
  | "conversion"
  | "products"
  | "shoppers"
  | "behavior";

export interface AnalyticsSummaryMetrics {
  totalEvents: number;
  eventsToday: number;
  uniqueEventNames: number;
  activeProjects: number;
  avgEventsPerDay: number;
}

export interface OverviewTabData {
  summary: AnalyticsSummaryMetrics;
  trend: EventTrend;
  insights: AnalyticsInsight[];
  comparison: PeriodComparison;
  health: AnalyticsHealth;
}

export interface ConversionTabData {
  commerceFunnel: CommerceFunnel;
  sessionFunnel: SessionFunnel;
}

export interface ProductsTabData {
  productPerformance: ProductPerformance;
}

export interface ShoppersTabData {
  shopperSummary: ShopperSummary;
}

export interface BehaviorTabData {
  topEvents: TopEvent[];
  eventsByProject: ProjectEventCount[];
  recentActivity: RecentEvent[];
  topProperties: TopProperty[];
}

function composeOverviewSummary(params: {
  scope: AnalyticsScope;
  eventActivity: EventActivityResult;
  trendPoints: TrendPoint[];
  trendGranularity: TrendGranularity | null;
  periodComparison: PeriodComparisonCounts;
}): OverviewTabData {
  const {
    scope,
    eventActivity,
    trendPoints,
    trendGranularity,
    periodComparison,
  } = params;
  const scopedTotal = eventActivity.totalEvents;

  // Average events per day across the scoped window.
  let avgEventsPerDay = 0;
  if (scopedTotal > 0) {
    const days = scope.range.dayCount ?? Math.max(1, trendPoints.length);
    avgEventsPerDay = roundPct(scopedTotal / days);
  }

  const insights = buildInsights({
    scopedTotal,
    projectId: scope.projectId,
    periodComparison,
    trendPoints,
    topEvents: eventActivity.topEvents,
    eventsByProject: eventActivity.eventsByProject,
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
    topEvent: eventActivity.topEvents[0],
    topProject: eventActivity.eventsByProject[0],
    comparisonDirection: comparison.direction,
    comparisonChangePercent: comparison.changePercent,
    hasCriticalSpike: insights.some(
      (insight) =>
        insight.type === "spike" && insight.severity === "critical",
    ),
  });

  return {
    summary: {
      totalEvents: scopedTotal,
      eventsToday: eventActivity.eventsToday,
      uniqueEventNames: eventActivity.uniqueEventNames,
      activeProjects: eventActivity.activeProjects,
      avgEventsPerDay,
    },
    trend: {
      granularity: trendGranularity ?? "day",
      points: trendPoints,
    },
    insights,
    comparison,
    health,
  };
}

export async function buildOverviewSummary(
  scope: AnalyticsScope,
): Promise<OverviewTabData> {
  const allTimeSpanDays = scope.range.isAllTime
    ? await fetchTrendSpanDays(scope)
    : null;
  const trendGranularity = resolveTrendGranularity(scope, allTimeSpanDays);
  const [eventActivity, trendPoints, periodComparison] = await Promise.all([
    fetchEventActivity(scope),
    fetchTrend(scope, trendGranularity),
    fetchPeriodComparison(scope),
  ]);

  return composeOverviewSummary({
    scope,
    eventActivity,
    trendPoints,
    trendGranularity,
    periodComparison,
  });
}

export async function buildConversionSummary(
  scope: AnalyticsScope,
): Promise<ConversionTabData> {
  const [commerceCounts, sessionFunnelResult] = await Promise.all([
    fetchCommerceCounts(scope),
    fetchSessionFunnel(scope),
  ]);

  return {
    commerceFunnel: buildCommerceFunnel(commerceCounts),
    sessionFunnel: buildSessionFunnel(sessionFunnelResult),
  };
}

export async function buildProductsSummary(
  scope: AnalyticsScope,
): Promise<ProductsTabData> {
  const [productRows, categoryRows] = await Promise.all([
    fetchProductPerformanceRows(scope),
    fetchCategoryPerformanceRows(scope),
  ]);

  return {
    productPerformance: buildProductPerformance({
      productRows,
      categoryRows,
    }),
  };
}

export async function buildShoppersSummary(
  scope: AnalyticsScope,
): Promise<ShoppersTabData> {
  return { shopperSummary: await fetchShopperSummary(scope) };
}

export async function buildBehaviorSummary(
  scope: AnalyticsScope,
): Promise<BehaviorTabData> {
  const eventActivity = await fetchEventActivity(scope);

  return {
    topEvents: eventActivity.topEvents,
    eventsByProject: eventActivity.eventsByProject,
    recentActivity: eventActivity.recentActivity,
    topProperties: eventActivity.topProperties,
  };
}
