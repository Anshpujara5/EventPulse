import { GlowCard } from "@/components/common/GlowCard";
import { eventStream } from "./dashboard-data";

export function LiveEventStream() {
  return (
    <GlowCard className="p-5 lg:col-span-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-black">Live Event Stream</h2>
        <span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-bold text-emerald-300">
          Live
        </span>
      </div>
      <div className="divide-y divide-slate-800 overflow-hidden rounded-xl border border-slate-800">
        {eventStream.map(([event, source, time, status, dot]) => (
          <div className="grid grid-cols-[1fr_auto_auto] items-center gap-3 bg-slate-950/25 px-4 py-3 text-sm" key={event}>
            <div className="flex items-center gap-3">
              <span className={`size-2.5 rounded-full ${dot}`} />
              <div>
                <p className="font-bold text-white">{event}</p>
                <p className="text-xs text-slate-500">{source}</p>
              </div>
            </div>
            <span className="rounded-md bg-white/4 px-2 py-1 text-xs text-slate-300">{status}</span>
            <span className="text-xs text-slate-500">{time}</span>
          </div>
        ))}
      </div>
    </GlowCard>
  );
}
