import { GlowCard } from "@/components/common/GlowCard";
import { Icon } from "@/components/common/Icon";
import type { SalesInsight } from "../analytics-types";

const INSIGHT_STYLES = {
  info: {
    icon: "activity",
    label: "Info",
    tone: "border-cyan-400/25 bg-cyan-500/10 text-cyan-300",
  },
  warning: {
    icon: "shield",
    label: "Warning",
    tone: "border-amber-400/25 bg-amber-500/10 text-amber-300",
  },
} as const;

export function SalesInsightsCard({ insights }: { insights: SalesInsight[] }) {
  if (insights.length === 0) {
    return null;
  }

  return (
    <GlowCard className="min-w-0 p-5">
      <h2 className="text-lg font-black text-white">Sales insights</h2>
      <p className="mt-1 text-xs leading-5 text-slate-500">
        Rule-based observations returned by the analytics API.
      </p>
      <div className="mt-4 space-y-3">
        {insights.map((insight) => {
          const style = INSIGHT_STYLES[insight.severity];
          return (
            <article
              className="flex min-w-0 gap-3 rounded-xl border border-slate-800 bg-slate-950/45 p-4"
              key={insight.id}
            >
              <div
                aria-hidden="true"
                className={`flex size-9 shrink-0 items-center justify-center rounded-full border ${style.tone}`}
              >
                <Icon className="size-4" name={style.icon} />
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-sm font-black text-white">
                    {insight.title}
                  </h3>
                  <span className={`rounded-full border px-2 py-0.5 text-[10px] font-black uppercase tracking-wide ${style.tone}`}>
                    {style.label}
                  </span>
                </div>
                <p className="mt-1 break-words text-xs leading-5 text-slate-400">
                  {insight.description}
                </p>
              </div>
            </article>
          );
        })}
      </div>
    </GlowCard>
  );
}
