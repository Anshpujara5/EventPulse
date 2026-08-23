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
  fetchCategoryLineItemAttribution,
  fetchProductLineItemAttribution,
} from "./lineItems";
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
import {
  buildOverviewSalesKpis,
  buildSalesAnalytics,
  type OverviewAovKpi,
  type OverviewGmvKpi,
  type OverviewOrdersKpi,
  type OverviewSalesKpis,
  type SalesTabData,
} from "./sales";
import { fetchShopperSummary, type ShopperSummary } from "./shopperSummary";
import {
  fetchShopperLifecycle,
  type ShopperLifecycle,
} from "./shopperLifecycle";
import {
  fetchShopperOrders,
  type RepeatPurchase,
  type TopShoppers,
} from "./shopperOrders";
import {
  fetchShopperTrend,
  type ShopperCoverage,
  type ShopperTrend,
} from "./shopperTrend";
import { roundPct } from "./shared/numbers";
import {
  fetchTrackingReadiness,
  type TrackingReadinessItem,
} from "./trackingReadiness";
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
  | "sales"
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
  orders: OverviewOrdersKpi;
  gmv: OverviewGmvKpi;
  aov: OverviewAovKpi;
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
  shopperTrend: ShopperTrend;
  shopperCoverage: ShopperCoverage;
  shopperLifecycle: ShopperLifecycle;
  repeatPurchase: RepeatPurchase;
  topShoppers: TopShoppers;
}

export interface BehaviorTabData {
  topEvents: TopEvent[];
  eventsByProject: ProjectEventCount[];
  recentActivity: RecentEvent[];
  topProperties: TopProperty[];
}

export type { SalesTabData } from "./sales";

function composeOverviewSummary(params: {
  scope: AnalyticsScope;
  eventActivity: EventActivityResult;
  trendPoints: TrendPoint[];
  trendGranularity: TrendGranularity | null;
  periodComparison: PeriodComparisonCounts;
  readiness: TrackingReadinessItem[];
  salesKpis: OverviewSalesKpis;
}): OverviewTabData {
  const {
    scope,
    eventActivity,
    trendPoints,
    trendGranularity,
    periodComparison,
    readiness,
    salesKpis,
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
    readiness,
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
    orders: salesKpis.orders,
    gmv: salesKpis.gmv,
    aov: salesKpis.aov,
  };
}

export async function buildOverviewSummary(
  scope: AnalyticsScope,
): Promise<OverviewTabData> {
  const allTimeSpanDays = scope.range.isAllTime
    ? await fetchTrendSpanDays(scope)
    : null;
  const trendGranularity = resolveTrendGranularity(scope, allTimeSpanDays);
  const [eventActivity, trendPoints, periodComparison, readiness, salesKpis] =
    await Promise.all([
      fetchEventActivity(scope),
      fetchTrend(scope, trendGranularity),
      fetchPeriodComparison(scope),
      fetchTrackingReadiness(scope),
      buildOverviewSalesKpis(scope),
    ]);

  return composeOverviewSummary({
    scope,
    eventActivity,
    trendPoints,
    trendGranularity,
    periodComparison,
    readiness,
    salesKpis,
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
  const [
    productRows,
    categoryRows,
    productLineItems,
    categoryLineItems,
  ] = await Promise.all([
    fetchProductPerformanceRows(scope),
    fetchCategoryPerformanceRows(scope),
    fetchProductLineItemAttribution(scope),
    fetchCategoryLineItemAttribution(scope),
  ]);

  return {
    productPerformance: buildProductPerformance({
      productRows,
      categoryRows,
      productLineItems,
      categoryLineItems,
    }),
  };
}

export async function buildSalesSummary(
  scope: AnalyticsScope,
): Promise<SalesTabData> {
  return buildSalesAnalytics(scope);
}

export async function buildShoppersSummary(
  scope: AnalyticsScope,
): Promise<ShoppersTabData> {
  const allTimeSpanDays = scope.range.isAllTime
    ? await fetchTrendSpanDays(scope)
    : null;
  const trendGranularity = resolveTrendGranularity(scope, allTimeSpanDays);
  const [shopperSummary, shopperTrendResult, shopperLifecycle, shopperOrders] =
    await Promise.all([
      fetchShopperSummary(scope),
      fetchShopperTrend(scope, trendGranularity),
      fetchShopperLifecycle(scope, trendGranularity),
      fetchShopperOrders(scope),
    ]);

  return {
    shopperSummary,
    shopperTrend: shopperTrendResult.trend,
    shopperCoverage: shopperTrendResult.coverage,
    shopperLifecycle,
    repeatPurchase: shopperOrders.repeatPurchase,
    topShoppers: shopperOrders.topShoppers,
  };
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
