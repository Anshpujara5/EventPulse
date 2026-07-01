import { GlowCard } from "@/components/common/GlowCard";
import type { HourlyBucket } from "./analytics-types";

function formatHour(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", hour12: false });
}

export function HourlyTrendChart({ buckets }: { buckets: HourlyBucket[] }) {
  if (buckets.length === 0) {
    return (
      <GlowCard className="p-5">
        <h2 className="text-lg font-black text-white">Event Trend (Last 24h)</h2>
        <div className="mt-5 flex h-48 items-center justify-center rounded-xl border border-slate-800 bg-slate-950/25">
          <p className="text-sm text-slate-500">No events in the last 24 hours.</p>
        </div>
      </GlowCard>
    );
  }

  const maxCount = Math.max(...buckets.map((b) => b.count), 1);
  const total = buckets.reduce((s, b) => s + b.count, 0);

  // Show at most 24 labels evenly spaced; for dense data show fewer
  const labelStep = Math.ceil(buckets.length / 8);

  return (
    <GlowCard className="p-5">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-black text-white">Event Trend (Last 24h)</h2>
          <p className="mt-1 text-xs text-slate-500">
            {buckets.length} hour bucket{buckets.length !== 1 ? "s" : ""} · {total.toLocaleString()} events total
          </p>
        </div>
        <span className="inline-flex items-center gap-2 text-xs font-bold text-slate-400">
          <span className="size-2 rounded-full bg-cyan-400" />
          Events / hour
        </span>
      </div>

      <div className="mt-5 overflow-hidden rounded-xl border border-slate-800/80 bg-slate-950/25 p-4">
        <div className="flex h-48 items-end gap-1">
          {buckets.map((bucket) => {
            const pct = Math.max((bucket.count / maxCount) * 100, 2);
            return (
              <div
                className="group relative flex flex-1 flex-col items-center justify-end"
                key={bucket.hour}
                title={`${formatHour(bucket.hour)}: ${bucket.count.toLocaleString()} events`}
              >
                <div
                  className="w-full rounded-t-sm bg-gradient-to-t from-blue-600 to-cyan-300 opacity-90 transition-opacity group-hover:opacity-100"
                  style={{ height: `${pct}%` }}
                />
              </div>
            );
          })}
        </div>
        <div className="mt-2 flex justify-between text-xs text-slate-500">
          {buckets
            .filter((_, i) => i % labelStep === 0 || i === buckets.length - 1)
            .map((b) => (
              <span key={b.hour}>{formatHour(b.hour)}</span>
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
          <p className="text-slate-500">Avg / hr</p>
          <p className="font-black text-white">
            {(total / buckets.length).toFixed(1)}
          </p>
        </div>
      </div>
    </GlowCard>
  );
}
