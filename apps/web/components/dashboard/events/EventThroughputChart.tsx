import { GlowCard } from "@/components/common/GlowCard";
import { throughputBars } from "./events-data";

export function EventThroughputChart() {
  return (
    <GlowCard className="p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-black text-white">Event Throughput</h2>
          <p className="mt-1 text-xs text-slate-500">Static 24-hour event flow.</p>
        </div>
        <span className="rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 py-1 text-xs font-black text-cyan-300">
          Live
        </span>
      </div>

      <div className="mt-5 flex items-center gap-4 text-xs font-bold">
        <span className="flex items-center gap-2 text-slate-300">
          <span className="size-2 rounded-full bg-blue-400" />
          Total Events
        </span>
        <span className="flex items-center gap-2 text-slate-300">
          <span className="size-2 rounded-full bg-rose-400" />
          Failed Events
        </span>
      </div>

      <div className="mt-6 flex h-44 items-end gap-2 border-b border-slate-800/80 pb-3">
        {throughputBars.map((height, index) => (
          <div className="flex flex-1 flex-col items-center justify-end gap-1" key={index}>
            <div
              className="w-full rounded-t-md bg-linear-to-t from-blue-600 to-cyan-300 shadow-[0_0_18px_rgba(14,165,233,0.18)]"
              style={{ height: `${height}%` }}
            />
            <div
              className="w-1/2 rounded-t-md bg-rose-400/80"
              style={{ height: `${Math.max(8, Math.round(height * 0.18))}%` }}
            />
          </div>
        ))}
      </div>

      <div className="mt-3 grid grid-cols-5 text-xs text-slate-500">
        {["18:00", "00:00", "06:00", "12:00", "18:00"].map((label, index) => (
          <span className="last:text-right" key={`${label}-${index}`}>
            {label}
          </span>
        ))}
      </div>
    </GlowCard>
  );
}
