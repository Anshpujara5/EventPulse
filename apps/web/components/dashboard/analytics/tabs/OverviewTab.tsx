import type {
  AnalyticsHealth,
  AnalyticsInsight,
  AnalyticsSummary,
  EventTrend,
  PeriodComparison,
} from "../analytics-types";
import { AnalyticsMetricCards } from "../AnalyticsMetricCards";
import { EventTrendChart } from "../HourlyTrendChart";
import { HealthCard } from "../HealthCard";
import { InsightsCard } from "../InsightsCard";
import { PreviousPeriodCard } from "../PreviousPeriodCard";

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
      <AnalyticsMetricCards summary={summary} scopeLabel={scopeLabel} />

      <section className="mt-4 grid gap-4 lg:grid-cols-[1fr_1fr_2fr]">
        <PreviousPeriodCard comparison={comparison} />
        <HealthCard health={health} />
        <InsightsCard insights={insights} />
      </section>

      <section className="mt-4">
        <EventTrendChart trend={trend} />
      </section>
    </>
  );
}
