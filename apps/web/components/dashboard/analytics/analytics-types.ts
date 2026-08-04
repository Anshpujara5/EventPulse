export interface AnalyticsSummary {
  totalEvents: number;
  eventsToday: number;
  uniqueEventNames: number;
  activeProjects: number;
  avgEventsPerDay: number;
}

export interface TopEvent {
  name: string;
  count: number;
  percentage: number;
}

export interface ProjectEventCount {
  projectId: string;
  projectName: string;
  count: number;
  percentage: number;
}

export type TrendGranularity = "hour" | "day" | "month";

export interface TrendPoint {
  date: string; // ISO datetime for the bucket start
  count: number;
}

export interface EventTrend {
  granularity: TrendGranularity;
  points: TrendPoint[];
}

export interface RecentEvent {
  id: string;
  name: string;
  projectName: string;
  createdAt: string;
}

export interface TopProperty {
  key: string;
  count: number;
}

export type InsightType =
  | "spike"
  | "drop"
  | "growth"
  | "inactive"
  | "dominant_event"
  | "project_hotspot"
  | "info";

export type InsightSeverity = "info" | "warning" | "critical";

export interface AnalyticsInsight {
  id: string;
  type: InsightType;
  severity: InsightSeverity;
  title: string;
  description: string;
  metricLabel?: string;
  metricValue?: string | number;
}

export type ComparisonDirection = "up" | "down" | "flat" | "new" | "no_data";

export interface PeriodComparison {
  currentPeriodEvents: number;
  previousPeriodEvents: number;
  changePercent: number | null;
  direction: ComparisonDirection;
  label: string;
}

export type HealthStatus = "healthy" | "watch" | "risk" | "inactive";

export type TrackingReadinessId =
  | "funnel"
  | "sessions"
  | "products"
  | "orders"
  | "gmvAov"
  | "productRevenue"
  | "payments"
  | "refunds";

export type TrackingReadinessStatus = "ready" | "locked";

// MIRROR: apps/server/src/analytics/trackingReadiness.ts
export interface TrackingReadinessItem {
  id: TrackingReadinessId;
  rung: number;
  status: TrackingReadinessStatus;
  label: string;
  unlockGuidance: string | null;
}

export interface AnalyticsHealth {
  score: number;
  status: HealthStatus;
  reasons: string[];
  readiness: TrackingReadinessItem[];
}

export type CommerceFunnelStepId =
  | "product_viewed"
  | "add_to_cart"
  | "checkout_started"
  | "purchase_completed";

export interface CommerceFunnelStep {
  id: CommerceFunnelStepId;
  label: string;
  count: number;
  conversionFromFirstPercent: number | null;
  conversionFromPreviousPercent: number | null;
  dropOffFromPreviousPercent: number | null;
}

export interface CommerceFunnelFriction {
  paymentFailed: number;
  outOfStock: number;
  itemUnavailable: number;
  deliveryFeeShown: number;
  etaShown: number;
  couponApplied: number;
}

export type CommerceFunnelInsightType =
  | "healthy"
  | "view_to_cart_drop"
  | "cart_to_checkout_drop"
  | "checkout_to_purchase_drop"
  | "missing_top_of_funnel"
  | "no_commerce_events";

export interface CommerceFunnelInsight {
  type: CommerceFunnelInsightType;
  severity: InsightSeverity;
  title: string;
  description: string;
}

export interface CommerceFunnel {
  label: string;
  totalCommerceEvents: number;
  commerceSignalEvents: number;
  steps: CommerceFunnelStep[];
  friction: CommerceFunnelFriction;
  insight: CommerceFunnelInsight;
}

export interface ShopperSummary {
  uniqueCustomers: number;
  uniqueSessions: number;
  purchasingSessions: number;
}

export interface ProductStat {
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

export interface CategoryStat {
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

export interface ProductPerformance {
  hasProductData: boolean;
  products: ProductStat[];
  highViewLowPurchase: ProductStat[];
  highCartLowPurchase: ProductStat[];
  categories: CategoryStat[];
}

// Session-based funnel — counts distinct shopper sessions per stage, as
// opposed to CommerceFunnel which counts raw events.
export interface SessionFunnelStep {
  id: CommerceFunnelStepId;
  label: string;
  sessions: number;
  conversionFromFirstPercent: number | null;
  conversionFromPreviousPercent: number | null;
  dropOffFromPreviousPercent: number | null;
  abandonedFromPrevious: number | null;
}

export interface SessionFunnelAbandonment {
  viewedNotCarted: number;
  cartedNotCheckout: number;
  checkoutNotPurchased: number;
}

export type SessionFunnelInsightType =
  | "healthy"
  | "view_to_cart_drop"
  | "cart_to_checkout_drop"
  | "checkout_to_purchase_drop"
  | "no_session_data";

export interface SessionFunnelInsight {
  type: SessionFunnelInsightType;
  severity: InsightSeverity;
  title: string;
  description: string;
}

export interface SessionFunnel {
  label: string;
  totalSessions: number;
  steps: SessionFunnelStep[];
  abandonment: SessionFunnelAbandonment;
  insight: SessionFunnelInsight;
}

// MIRROR: apps/server/src/analytics/summary.ts
export interface OverviewTabData {
  summary: AnalyticsSummary;
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
}

export interface BehaviorTabData {
  topEvents: TopEvent[];
  eventsByProject: ProjectEventCount[];
  recentActivity: RecentEvent[];
  topProperties: TopProperty[];
}

export type SalesOrderCountBasis =
  | "distinct-order-id"
  | "purchasing-session-estimate";

export type SalesOrdersMeasurement =
  | {
      status: "confirmed";
      basis: "distinct-order-id";
      value: number;
      label: "Confirmed orders";
      isEstimated: false;
      unlockGuidance: null;
    }
  | {
      status: "estimated";
      basis: "purchasing-session-estimate";
      value: number;
      label: "Estimated from purchasing sessions";
      isEstimated: true;
      unlockGuidance: string;
    }
  | {
      status: "unavailable";
      basis: null;
      value: null;
      label: "Orders unavailable";
      isEstimated: false;
      unlockGuidance: string;
    };

export interface SalesCurrencySlice {
  currency: string;
  gmv: number;
  moneyBearingOrders: number;
  aov: number;
  orderSharePercent: number;
}

export type SalesMoneyMeasurement =
  | {
      status: "available";
      dominantCurrency: string;
      headlineGmv: number;
      headlineAov: number;
      aovBasisNote: string;
      currencies: SalesCurrencySlice[];
      otherCurrencyOrders: number;
      otherCurrencyCount: number;
      unlockGuidance: null;
    }
  | {
      status: "unavailable";
      dominantCurrency: null;
      headlineGmv: null;
      headlineAov: null;
      aovBasisNote: null;
      currencies: [];
      otherCurrencyOrders: 0;
      otherCurrencyCount: 0;
      unlockGuidance: string;
    };

export interface SalesTrendPoint {
  date: string;
  orders: number;
  gmv: number | null;
}

export interface SalesTrend {
  granularity: TrendGranularity;
  orderBasis: SalesOrderCountBasis;
  gmvCurrency: string | null;
  points: SalesTrendPoint[];
}

export interface SalesMetricComparison {
  current: number;
  previous: number | null;
  changePercent: number | null;
  direction: ComparisonDirection;
  label: string;
}

export interface SalesOrdersComparison extends SalesMetricComparison {
  basis: SalesOrderCountBasis;
}

export interface SalesMoneyComparison extends SalesMetricComparison {
  currency: string;
  currentMoneyBearingOrders: number;
  previousMoneyBearingOrders: number;
}

export type OverviewOrdersKpi = SalesOrdersMeasurement & {
  comparison: SalesOrdersComparison | null;
};

export type OverviewGmvKpi =
  | {
      status: "available";
      value: number;
      currency: string;
      otherCurrencyOrders: number;
      otherCurrencyCount: number;
      comparison: SalesMoneyComparison | null;
      unlockGuidance: null;
    }
  | {
      status: "unavailable";
      value: null;
      currency: null;
      otherCurrencyOrders: 0;
      otherCurrencyCount: 0;
      comparison: null;
      unlockGuidance: string;
    };

export type OverviewAovKpi =
  | {
      status: "available";
      value: number;
      currency: string;
      basisNote: string;
      comparison: SalesMoneyComparison | null;
      unlockGuidance: null;
    }
  | {
      status: "unavailable";
      value: null;
      currency: null;
      basisNote: null;
      comparison: null;
      unlockGuidance: string;
    };

export interface SalesDataQuality {
  purchaseEvents: number;
  purchaseEventsWithOrderId: number;
  purchaseEventsWithOrderIdPercent: number | null;
  paymentOnlyOrderIds: number;
  missingOrderIdPurchaseEvents: number;
  ordersWithoutMoney: number;
  missingAmountOrders: number;
  invalidAmountOrders: number;
  negativeAmountOrders: number;
  missingCurrencyOrders: number;
  invalidCurrencyOrders: number;
  conflictingMoneyEvidence: number;
}

export interface SalesInsight {
  id: "gmv-change";
  severity: "info" | "warning";
  title: string;
  description: string;
  changePercent: number;
  currency: string;
}

// MIRROR: apps/server/src/analytics/sales.ts
export interface SalesTabData {
  orders: SalesOrdersMeasurement;
  money: SalesMoneyMeasurement;
  trend: SalesTrend | null;
  comparison: {
    orders: SalesOrdersComparison | null;
    gmv: SalesMoneyComparison | null;
    aov: SalesMoneyComparison | null;
  };
  insights: SalesInsight[];
  dataQuality: SalesDataQuality;
}

export interface AnalyticsTabDataMap {
  overview: OverviewTabData;
  conversion: ConversionTabData;
  sales: SalesTabData;
  products: ProductsTabData;
  shoppers: ShoppersTabData;
  behavior: BehaviorTabData;
}

export type AnalyticsDataTabId = keyof AnalyticsTabDataMap;
