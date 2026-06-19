import { GlowCard } from "@/components/common/GlowCard";
import { bars } from "./dashboard-data";

export function ApiTrafficCard() {
  return (
    <GlowCard className="p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-black">API Traffic</h2>
        <span className="text-xs font-bold text-cyan-300">Healthy</span>
      </div>
      <div className="flex h-40 items-end gap-2 rounded-xl bg-slate-950/35 p-4">
        {bars.map((height, index) => (
          <div className="flex-1 rounded-t bg-linear-to-t from-blue-700 to-cyan-300" key={`${height}-${index}`} style={{ height: `${height}%` }} />
        ))}
      </div>
      <div className="mt-4 grid grid-cols-3 text-center text-sm text-slate-400">
        <span>Requests</span>
        <span>Latency</span>
        <span>Errors</span>
      </div>
    </GlowCard>
  );
}
