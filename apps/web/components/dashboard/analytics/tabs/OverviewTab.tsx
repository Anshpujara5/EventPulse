import type {
  AnalyticsHealth,
  AnalyticsInsight,
  AnalyticsSummary,
  EventTrend,
  OverviewAovKpi,
  OverviewGmvKpi,
  OverviewOrdersKpi,
  PeriodComparison,
} from "../analytics-types";
import { AnalyticsMetricCards } from "../AnalyticsMetricCards";
import { EventTrendChart } from "../HourlyTrendChart";
import { OverviewSalesMetricCards } from "../OverviewSalesMetricCards";
import { TrackingHealthInsightsCard } from "../TrackingHealthInsightsCard";

export function OverviewTab({
  summary,
  scopeLabel,
  comparison,
  health,
  insights,
  trend,
  orders,
  gmv,
  aov,
}: {
  summary: AnalyticsSummary;
  scopeLabel: string;
  comparison: PeriodComparison;
  health: AnalyticsHealth;
  insights: AnalyticsInsight[];
  trend: EventTrend;
  orders: OverviewOrdersKpi;
  gmv: OverviewGmvKpi;
  aov: OverviewAovKpi;
}) {
  return (
    <>
      <AnalyticsMetricCards
        comparison={
          scopeLabel.endsWith(" · All time") ? undefined : comparison
        }
        scopeLabel={scopeLabel}
        summary={summary}
      />

      <OverviewSalesMetricCards aov={aov} gmv={gmv} orders={orders} />

      <section className="mt-4">
        <TrackingHealthInsightsCard health={health} insights={insights} />
      </section>

      <section className="mt-4">
        <EventTrendChart trend={trend} />
      </section>
    </>
  );
}
