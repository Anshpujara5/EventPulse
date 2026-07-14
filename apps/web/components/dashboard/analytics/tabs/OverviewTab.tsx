import type {
  AnalyticsHealth,
  AnalyticsInsight,
  AnalyticsSummary,
  EventTrend,
  PeriodComparison,
} from "../analytics-types";
import { AnalyticsMetricCards } from "../AnalyticsMetricCards";
import { EventTrendChart } from "../HourlyTrendChart";
import { TrackingHealthInsightsCard } from "../TrackingHealthInsightsCard";

export function OverviewTab({
  summary,
  scopeLabel,
  comparison,
  health,
  insights,
  trend,
}: {
  summary: AnalyticsSummary;
  scopeLabel: string;
  comparison: PeriodComparison;
  health: AnalyticsHealth;
  insights: AnalyticsInsight[];
  trend: EventTrend;
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

      <section className="mt-4">
        <TrackingHealthInsightsCard health={health} insights={insights} />
      </section>

      <section className="mt-4">
        <EventTrendChart trend={trend} />
      </section>
    </>
  );
}
