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
} from "./comparison";
import {
  fetchEventActivity,
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
} from "./trend";

export interface AnalyticsSummaryMetrics {
  totalEvents: number;
  eventsToday: number;
  uniqueEventNames: number;
  activeProjects: number;
  avgEventsPerDay: number;
}

export interface AnalyticsSummaryData {
  summary: AnalyticsSummaryMetrics;
  trend: EventTrend;
  topEvents: TopEvent[];
  eventsByProject: ProjectEventCount[];
  recentActivity: RecentEvent[];
  topProperties: TopProperty[];
  insights: AnalyticsInsight[];
  comparison: PeriodComparison;
  health: AnalyticsHealth;
  commerceFunnel: CommerceFunnel;
  sessionFunnel: SessionFunnel;
  productPerformance: ProductPerformance;
  shopperSummary: ShopperSummary;
}

export async function buildAnalyticsSummary(
  scope: AnalyticsScope,
): Promise<AnalyticsSummaryData> {
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

    fetchProductPerformanceRows(scope),
    fetchCategoryPerformanceRows(scope),
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
  };
}
