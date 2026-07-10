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

export interface AnalyticsHealth {
  score: number;
  status: HealthStatus;
  reasons: string[];
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

export interface AnalyticsData {
  summary: AnalyticsSummary;
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
