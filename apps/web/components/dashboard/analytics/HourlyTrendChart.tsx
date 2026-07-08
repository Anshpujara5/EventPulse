import { GlowCard } from "@/components/common/GlowCard";
import type { EventTrend, TrendGranularity } from "./analytics-types";

const TITLES: Record<TrendGranularity, string> = {
  hour: "Event Trend (Last 24h)",
  day: "Event Trend (Daily)",
  month: "Event Trend (Monthly)",
};

const UNIT_LABELS: Record<TrendGranularity, string> = {
  hour: "Events / hour",
  day: "Events / day",
  month: "Events / month",
};

function formatLabel(iso: string, granularity: TrendGranularity): string {
  const d = new Date(iso);
  if (granularity === "hour") {
    return d.toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  }
  if (granularity === "day") {
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  }
  return d.toLocaleDateString(undefined, { month: "short", year: "2-digit" });
}

export function EventTrendChart({ trend }: { trend: EventTrend }) {
  const { points, granularity } = trend;

  const total = points.reduce((s, b) => s + b.count, 0);

  if (points.length === 0 || total === 0) {
    return (
      <GlowCard className="p-5">
        <h2 className="text-lg font-black text-white">{TITLES[granularity]}</h2>
        <div className="mt-5 flex h-48 items-center justify-center rounded-xl border border-slate-800 bg-slate-950/25">
          <p className="text-sm text-slate-500">No trend data for this range.</p>
        </div>
      </GlowCard>
    );
  }

  const maxCount = Math.max(...points.map((b) => b.count), 1);

  // Show at most ~8 labels evenly spaced; for dense data show fewer
  const labelStep = Math.ceil(points.length / 8);

  return (
    <GlowCard className="p-5">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-black text-white">{TITLES[granularity]}</h2>
          <p className="mt-1 text-xs text-slate-500">
            {points.length} bucket{points.length !== 1 ? "s" : ""} · {total.toLocaleString()} events total
          </p>
        </div>
        <span className="inline-flex items-center gap-2 text-xs font-bold text-slate-400">
          <span className="size-2 rounded-full bg-cyan-400" />
          {UNIT_LABELS[granularity]}
        </span>
      </div>

      <div className="mt-5 overflow-hidden rounded-xl border border-slate-800/80 bg-slate-950/25 p-4">
        {/* items-stretch (not items-end) so each column div actually gets a
            resolved height — the bar inside is sized with a CSS percentage,
            which only computes against a parent that has a real height. */}
        <div className="flex h-48 items-stretch gap-1">
          {points.map((point) => {
            const pct = Math.max((point.count / maxCount) * 100, 4);
            return (
              <div
                className="group relative flex flex-1 flex-col justify-end"
                key={point.date}
                title={`${formatLabel(point.date, granularity)} — ${point.count.toLocaleString()} events`}
              >
                <div
                  className="w-full min-h-[3px] rounded-t-sm bg-gradient-to-t from-blue-600 to-cyan-300 opacity-90 transition-opacity group-hover:opacity-100"
                  style={{ height: `${pct}%` }}
                />
              </div>
            );
          })}
        </div>
        <div className="mt-2 flex justify-between text-xs text-slate-500">
          {points
            .filter((_, i) => i % labelStep === 0 || i === points.length - 1)
            .map((p) => (
              <span key={p.date}>{formatLabel(p.date, granularity)}</span>
            ))}
        </div>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-4 border-t border-slate-800/60 pt-3 text-center text-sm">
        <div>
          <p className="text-slate-500">Peak</p>
          <p className="font-black text-white">{maxCount.toLocaleString()}</p>
        </div>
        <div>
          <p className="text-slate-500">Total</p>
          <p className="font-black text-white">{total.toLocaleString()}</p>
        </div>
        <div>
          <p className="text-slate-500">Avg / bucket</p>
          <p className="font-black text-white">
            {(total / points.length).toFixed(1)}
          </p>
        </div>
      </div>
    </GlowCard>
  );
}
