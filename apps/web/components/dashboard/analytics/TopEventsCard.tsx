import { GlowCard } from "@/components/common/GlowCard";
import { Icon } from "@/components/common/Icon";
import type { TopEvent } from "./analytics-types";

const ICON_CYCLE = ["activity", "pulse", "database", "key", "bell", "chart", "code", "send", "monitor", "bolt"] as const;
const TONE_CYCLE = [
  "text-blue-400", "text-cyan-400", "text-violet-400",
  "text-emerald-400", "text-rose-400", "text-amber-400",
  "text-fuchsia-400", "text-sky-400", "text-teal-400", "text-orange-400",
] as const;

export function TopEventsCard({ events }: { events: TopEvent[] }) {
  const maxCount = events[0]?.count ?? 1;

  return (
    <GlowCard className="p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-black text-white">Top Events</h2>
        <span className="text-xs text-slate-500">By volume</span>
      </div>

      {events.length === 0 ? (
        <p className="mt-6 text-center text-sm text-slate-500">No events yet.</p>
      ) : (
        <div className="mt-4 divide-y divide-slate-800/80">
          {events.map((event, index) => {
            const icon = ICON_CYCLE[index % ICON_CYCLE.length];
            const tone = TONE_CYCLE[index % TONE_CYCLE.length];
            const barPct = Math.max((event.count / maxCount) * 100, 4);
            return (
              <div className="py-3" key={event.name}>
                <div className="grid grid-cols-[24px_1fr_auto] items-center gap-3 text-sm">
                  <span className="font-bold text-slate-500">{index + 1}</span>
                  <span className="flex min-w-0 items-center gap-3">
                    <span
                      className={`flex size-7 shrink-0 items-center justify-center rounded-lg border border-slate-700/80 bg-slate-950/60 ${tone}`}
                    >
                      <Icon className="size-3.5" name={icon} />
                    </span>
                    <span className="truncate font-bold text-slate-200">
                      {event.name}
                    </span>
                  </span>
                  <span className="flex items-baseline gap-2">
                    <span className="font-black text-white">
                      {event.count.toLocaleString()}
                    </span>
                    <span className="text-xs font-bold text-slate-500">
                      {event.percentage}%
                    </span>
                  </span>
                </div>
                <div className="mt-2 ml-9 h-1 rounded-full bg-slate-800">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-blue-600 to-cyan-400"
                    style={{ width: `${barPct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      <a
        className="mt-3 block text-right text-sm font-black text-cyan-400 hover:text-cyan-300"
        href="/dashboard/events"
      >
        View all events →
      </a>
    </GlowCard>
  );
}
