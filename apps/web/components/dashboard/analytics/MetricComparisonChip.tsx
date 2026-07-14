import type {
  ComparisonDirection,
  PeriodComparison,
} from "./analytics-types";

const DIRECTION_STYLES: Record<ComparisonDirection, string> = {
  up: "border-emerald-400/25 bg-emerald-500/10 text-emerald-300",
  down: "border-rose-400/25 bg-rose-500/10 text-rose-300",
  flat: "border-slate-600/40 bg-slate-800/40 text-slate-300",
  new: "border-cyan-400/25 bg-cyan-500/10 text-cyan-300",
  no_data: "border-slate-700/50 bg-slate-800/30 text-slate-400",
};

function periodLabel(label: string): string {
  const prefix = "Compared with ";
  return label.startsWith(prefix) ? label.slice(prefix.length) : "previous period";
}

function comparisonText(comparison: PeriodComparison): {
  direction: ComparisonDirection;
  text: string;
} {
  const period = periodLabel(comparison.label);
  const changePercent = comparison.changePercent;

  switch (comparison.direction) {
    case "up":
      return changePercent === null
        ? {
            direction: "no_data",
            text: "— Previous period unavailable",
          }
        : {
            direction: "up",
            text: `↑ ${Math.abs(changePercent)}% vs ${period}`,
          };
    case "down":
      return changePercent === null
        ? {
            direction: "no_data",
            text: "— Previous period unavailable",
          }
        : {
            direction: "down",
            text: `↓ ${Math.abs(changePercent)}% vs ${period}`,
          };
    case "flat":
      if (changePercent === null) {
        return {
          direction: "no_data",
          text: "— Previous period unavailable",
        };
      }
      return changePercent === 0
        ? { direction: "flat", text: `→ No change vs ${period}` }
        : {
            direction: "flat",
            text: `→ Stable (${changePercent > 0 ? "+" : ""}${changePercent}%) vs ${period}`,
          };
    case "new":
      return {
        direction: "new",
        text: `↑ New activity vs ${period}`,
      };
    case "no_data":
      return {
        direction: "no_data",
        text: "— Previous period unavailable",
      };
  }
}

export function MetricComparisonChip({
  comparison,
}: {
  comparison: PeriodComparison;
}) {
  const presentation = comparisonText(comparison);
  const detail = `${presentation.text}. Current period: ${comparison.currentPeriodEvents.toLocaleString()} events. Previous period: ${comparison.previousPeriodEvents.toLocaleString()} events.`;

  return (
    <span
      aria-label={detail}
      className={`mt-2 inline-flex max-w-full rounded-full border px-2 py-1 text-[11px] font-bold leading-4 ${DIRECTION_STYLES[presentation.direction]}`}
      title={detail}
    >
      <span className="min-w-0 break-words whitespace-normal">
        {presentation.text}
      </span>
    </span>
  );
}
