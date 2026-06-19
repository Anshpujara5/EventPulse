import { AnalyticsFilterBar } from "./AnalyticsFilterBar";
import { AnalyticsMetricCard } from "./AnalyticsMetricCard";
import { analyticsMetrics } from "./analytics-data";
import { ConversionFunnelCard } from "./ConversionFunnelCard";
import { EventTrendsChart } from "./EventTrendsChart";
import { TopEventsCard } from "./TopEventsCard";
import { TrafficSegmentsCard } from "./TrafficSegmentsCard";
import { UserBehaviorCard } from "./UserBehaviorCard";

export function AnalyticsOverview() {
  return (
    <div className="mx-auto max-w-[1420px] px-4 py-5 sm:px-6">
      <div>
        <h1 className="text-3xl font-black tracking-tight">Analytics</h1>
        <p className="mt-1 text-sm text-slate-400">
          Analyze event trends, user behavior, and product performance.
        </p>
      </div>

      <AnalyticsFilterBar />

      <section className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {analyticsMetrics.map((metric) => (
          <AnalyticsMetricCard key={metric.label} metric={metric} />
        ))}
      </section>

      <section className="mt-4">
        <EventTrendsChart />
      </section>

      <section className="mt-4 grid gap-4 xl:grid-cols-[1.15fr_1fr_1fr_1.1fr]">
        <ConversionFunnelCard />
        <TopEventsCard />
        <UserBehaviorCard />
        <TrafficSegmentsCard />
      </section>
    </div>
  );
}
