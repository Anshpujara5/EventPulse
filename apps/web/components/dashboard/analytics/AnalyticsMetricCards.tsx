import { GlowCard } from "@/components/common/GlowCard";
import { Icon } from "@/components/common/Icon";
import type { AnalyticsSummary, PeriodComparison } from "./analytics-types";
import { MetricComparisonChip } from "./MetricComparisonChip";

interface CardDef {
  label: string;
  value: string;
  detail: string;
  icon: string;
  tone: string;
  boxClassName: string;
  comparison?: PeriodComparison;
}

function buildCards(
  s: AnalyticsSummary,
  scopeLabel: string,
  comparison?: PeriodComparison,
): CardDef[] {
  return [
    {
      label: "Total Events",
      value: s.totalEvents.toLocaleString(),
      detail: scopeLabel,
      icon: "pulse",
      tone: "text-blue-400",
      boxClassName: "border-blue-400/25 bg-blue-500/10",
      comparison,
    },
    {
      label: "Events Today",
      value: s.eventsToday.toLocaleString(),
      detail: "Since midnight UTC",
      icon: "database",
      tone: "text-cyan-400",
      boxClassName: "border-cyan-400/25 bg-cyan-500/10",
    },
    {
      label: "Unique Event Names",
      value: s.uniqueEventNames.toLocaleString(),
      detail: scopeLabel,
      icon: "list",
      tone: "text-fuchsia-400",
      boxClassName: "border-fuchsia-400/25 bg-fuchsia-500/10",
    },
    {
      label: "Active Projects",
      value: s.activeProjects.toLocaleString(),
      detail: "Projects with events",
      icon: "folder",
      tone: "text-emerald-400",
      boxClassName: "border-emerald-400/25 bg-emerald-500/10",
    },
    {
      label: "Avg Events / Day",
      value: s.avgEventsPerDay.toLocaleString(undefined, {
        maximumFractionDigits: 1,
      }),
      detail: scopeLabel,
      icon: "clock",
      tone: "text-violet-400",
      boxClassName: "border-violet-400/25 bg-violet-500/10",
    },
  ];
}

export function AnalyticsMetricCards({
  summary,
  scopeLabel,
  comparison,
}: {
  summary: AnalyticsSummary;
  scopeLabel: string;
  comparison?: PeriodComparison;
}) {
  return (
    <section className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
      {buildCards(summary, scopeLabel, comparison).map((card) => (
        <GlowCard className="p-5" key={card.label}>
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-sm font-medium text-slate-400">{card.label}</p>
              <p className="mt-3 text-3xl font-black tracking-tight text-white">
                {card.value}
              </p>
              {card.comparison && (
                <MetricComparisonChip comparison={card.comparison} />
              )}
              <p className="mt-2 text-sm text-slate-500">{card.detail}</p>
            </div>
            <div
              className={`flex size-12 shrink-0 items-center justify-center rounded-full border ${card.boxClassName} ${card.tone}`}
            >
              <Icon name={card.icon} />
            </div>
          </div>
        </GlowCard>
      ))}
    </section>
  );
}
