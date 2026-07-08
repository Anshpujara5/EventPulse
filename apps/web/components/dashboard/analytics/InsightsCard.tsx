import { GlowCard } from "@/components/common/GlowCard";
import { Icon } from "@/components/common/Icon";
import type { AnalyticsInsight, InsightSeverity } from "./analytics-types";

const SEVERITY_STYLES: Record<
  InsightSeverity,
  { icon: string; boxClassName: string; tone: string }
> = {
  info: {
    icon: "activity",
    boxClassName: "border-cyan-400/25 bg-cyan-500/10",
    tone: "text-cyan-300",
  },
  warning: {
    icon: "shield",
    boxClassName: "border-amber-400/25 bg-amber-500/10",
    tone: "text-amber-300",
  },
  critical: {
    icon: "bell",
    boxClassName: "border-rose-400/25 bg-rose-500/10",
    tone: "text-rose-300",
  },
};

export function InsightsCard({ insights }: { insights: AnalyticsInsight[] }) {
  return (
    <GlowCard className="p-5">
      <div className="flex items-center gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-full border border-violet-400/25 bg-violet-500/10 text-violet-300">
          <Icon name="spark" className="size-5" />
        </div>
        <div>
          <h2 className="text-lg font-black text-white">Key Insights</h2>
          <p className="text-xs text-slate-500">
            Rule-based signals computed from your real event data.
          </p>
        </div>
      </div>

      {insights.length === 0 ? (
        <p className="mt-5 text-center text-sm text-slate-500">
          No major changes detected in this scope.
        </p>
      ) : (
        <div className="mt-4 grid gap-3">
          {insights.map((insight) => {
            const style = SEVERITY_STYLES[insight.severity];
            return (
              <div
                className="flex flex-col gap-3 rounded-xl border border-slate-800 bg-slate-950/50 px-4 py-3 sm:flex-row sm:items-start"
                key={insight.id}
              >
                <div
                  className={`flex size-9 shrink-0 items-center justify-center rounded-full border ${style.boxClassName} ${style.tone}`}
                >
                  <Icon name={style.icon} className="size-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-white">{insight.title}</p>
                  <p className="mt-0.5 text-xs text-slate-400">
                    {insight.description}
                  </p>
                </div>
                {insight.metricValue !== undefined && (
                  <div className="shrink-0 sm:text-right">
                    {insight.metricLabel && (
                      <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
                        {insight.metricLabel}
                      </p>
                    )}
                    <p className={`font-black ${style.tone}`}>
                      {insight.metricValue}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </GlowCard>
  );
}
