import { GlowCard } from "@/components/common/GlowCard";
import { Icon } from "@/components/common/Icon";
import { topEvents } from "./analytics-data";

export function TopEventsCard() {
  return (
    <GlowCard className="p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-black text-white">Top Events</h2>
        <span className="text-xs text-slate-500">Ranked by volume</span>
      </div>
      <div className="mt-4 divide-y divide-slate-800/80">
        {topEvents.map(([event, value, icon, tone], index) => (
          <div className="grid grid-cols-[28px_1fr_auto] items-center gap-3 py-3 text-sm" key={event}>
            <span className="font-bold text-slate-500">{index + 1}</span>
            <span className="flex min-w-0 items-center gap-3">
              <span className={`flex size-8 items-center justify-center rounded-lg border border-slate-700/80 bg-slate-950/60 ${tone}`}>
                <Icon name={icon} className="size-4" />
              </span>
              <span className="truncate font-bold text-slate-200">{event}</span>
            </span>
            <span className="font-black text-white">{value}</span>
          </div>
        ))}
      </div>
      <a className="mt-3 block text-right text-sm font-black text-cyan-400 hover:text-cyan-300" href="#">
        View all events →
      </a>
    </GlowCard>
  );
}
