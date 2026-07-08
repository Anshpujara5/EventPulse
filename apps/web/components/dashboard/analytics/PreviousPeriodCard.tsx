import { GlowCard } from "@/components/common/GlowCard";
import { Icon } from "@/components/common/Icon";
import type { ComparisonDirection, PeriodComparison } from "./analytics-types";

const DIRECTION_STYLES: Record<
  ComparisonDirection,
  { tone: string; boxClassName: string }
> = {
  up: { tone: "text-emerald-300", boxClassName: "border-emerald-400/25 bg-emerald-500/10" },
  down: { tone: "text-rose-300", boxClassName: "border-rose-400/25 bg-rose-500/10" },
  flat: { tone: "text-slate-300", boxClassName: "border-slate-600/40 bg-slate-800/40" },
  new: { tone: "text-cyan-300", boxClassName: "border-cyan-400/25 bg-cyan-500/10" },
  no_data: { tone: "text-slate-400", boxClassName: "border-slate-700/50 bg-slate-800/30" },
};

function directionCopy(comparison: PeriodComparison): string {
  const pct = comparison.changePercent !== null ? Math.abs(comparison.changePercent) : null;
  switch (comparison.direction) {
    case "up":
      return `Up ${pct}% from previous period`;
    case "down":
      return `Down ${pct}% from previous period`;
    case "flat":
      return "Flat compared with previous period";
    case "new":
      return "New activity in this period";
    case "no_data":
      return "No events in either period";
  }
}

export function PreviousPeriodCard({ comparison }: { comparison: PeriodComparison }) {
  const style = DIRECTION_STYLES[comparison.direction];

  return (
    <GlowCard className="p-5">
      <div className="flex items-center gap-3">
        <div
          className={`flex size-10 shrink-0 items-center justify-center rounded-full border ${style.boxClassName} ${style.tone}`}
        >
          <Icon name="chart" className="size-5" />
        </div>
        <div>
          <h2 className="text-lg font-black text-white">Previous Period</h2>
          <p className="text-xs text-slate-500">{comparison.label}</p>
        </div>
      </div>

      <p className={`mt-4 text-sm font-bold ${style.tone}`}>{directionCopy(comparison)}</p>

      <div className="mt-4 grid grid-cols-2 gap-4 border-t border-slate-800/60 pt-3 text-center text-sm">
        <div>
          <p className="text-slate-500">Current period</p>
          <p className="font-black text-white">
            {comparison.currentPeriodEvents.toLocaleString()}
          </p>
        </div>
        <div>
          <p className="text-slate-500">Previous period</p>
          <p className="font-black text-white">
            {comparison.previousPeriodEvents.toLocaleString()}
          </p>
        </div>
      </div>
    </GlowCard>
  );
}
