import { GlowCard } from "@/components/common/GlowCard";
import { healthRows } from "./dashboard-data";

export function SystemHealthCard() {
  return (
    <GlowCard className="p-5">
      <h2 className="text-lg font-black">System Health</h2>
      <div className="mt-4 divide-y divide-slate-800">
        {healthRows.map((row) => (
          <div className="flex items-center justify-between py-3 text-sm" key={row}>
            <span className="flex items-center gap-2 text-slate-300">
              <span className="size-2 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.75)]" />
              {row}
            </span>
            <span className="rounded-md bg-emerald-500/10 px-2 py-1 text-xs font-black text-emerald-300">
              Healthy
            </span>
          </div>
        ))}
      </div>
    </GlowCard>
  );
}
