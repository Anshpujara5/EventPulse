import { EventDetailsPanel } from "./EventDetailsPanel";
import { EventMetricCard } from "./EventMetricCard";
import { EventsFilterBar } from "./EventsFilterBar";
import { EventThroughputChart } from "./EventThroughputChart";
import { eventMetrics } from "./events-data";
import { LiveEventTable } from "./LiveEventTable";

export function EventsOverview() {
  return (
    <div className="mx-auto max-w-[1420px] px-4 py-5 sm:px-6">
      <div>
        <h1 className="text-3xl font-black tracking-tight">Events</h1>
        <p className="mt-1 text-sm text-slate-400">
          Monitor incoming user actions and system events in real time.
        </p>
      </div>

      <EventsFilterBar />

      <section className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {eventMetrics.map((metric) => (
          <EventMetricCard key={metric.label} metric={metric} />
        ))}
      </section>

      <section className="mt-4 grid gap-4 xl:grid-cols-[1.45fr_0.85fr]">
        <LiveEventTable />
        <div className="grid gap-4">
          <EventThroughputChart />
          <EventDetailsPanel />
        </div>
      </section>
    </div>
  );
}
