import { GlowCard } from "@/components/common/GlowCard";
import { Icon } from "@/components/common/Icon";
import type { EventSummary } from "./event-types";

interface MetricDef {
  label: string;
  value: string;
  detail: string;
  icon: string;
  tone: string;
  boxClassName: string;
}

function buildCards(summary: EventSummary): MetricDef[] {
  return [
    {
      label: "Total Events",
      value: summary.total.toLocaleString(),
      detail: "All time, all projects — unfiltered",
      icon: "database",
      tone: "text-cyan-400",
      boxClassName: "border-cyan-400/25 bg-cyan-500/10",
    },
    {
      label: "Events Today",
      value: summary.today.toLocaleString(),
      detail: "Since midnight UTC — unfiltered",
      icon: "pulse",
      tone: "text-emerald-400",
      boxClassName: "border-emerald-400/20 bg-emerald-500/10",
    },
    {
      label: "Matching Filters",
      value: summary.matching.toLocaleString(),
      detail: "Events in the list below, current scope",
      icon: "search",
      tone: "text-violet-400",
      boxClassName: "border-violet-400/25 bg-violet-500/10",
    },
  ];
}

export function EventsMetricCards({ summary }: { summary: EventSummary }) {
  const cards = buildCards(summary);
  return (
    <section className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {cards.map((metric) => (
        <GlowCard className="p-5" key={metric.label}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-slate-400">
                {metric.label}
              </p>
              <p className="mt-3 text-3xl font-black tracking-tight text-white">
                {metric.value}
              </p>
              <p className="mt-2 text-sm font-medium text-slate-500">
                {metric.detail}
              </p>
            </div>
            <div
              className={`flex size-12 items-center justify-center rounded-xl border ${metric.boxClassName} ${metric.tone}`}
            >
              <Icon name={metric.icon} />
            </div>
          </div>
        </GlowCard>
      ))}
    </section>
  );
}
