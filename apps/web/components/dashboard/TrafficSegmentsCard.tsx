import { GlowCard } from "@/components/common/GlowCard";
import { trafficSegments } from "./analytics-data";

export function TrafficSegmentsCard() {
  return (
    <GlowCard className="p-5">
      <h2 className="text-lg font-black text-white">Traffic Segments</h2>
      <div className="mt-5 grid gap-5 sm:grid-cols-[150px_1fr] sm:items-center">
        <div className="mx-auto size-36 rounded-full bg-[conic-gradient(#3b82f6_0_58%,#22d3ee_58%_85%,#8b5cf6_85%_95%,#f43f5e_95%_100%)] p-5 shadow-[0_0_30px_rgba(14,165,233,0.15)]">
          <div className="flex size-full items-center justify-center rounded-full bg-[#071426] text-center">
            <span className="text-sm font-black text-white">Sources</span>
          </div>
        </div>
        <div className="grid gap-3">
          {trafficSegments.map(([label, value, color]) => (
            <div className="flex items-center justify-between gap-4 text-sm" key={label}>
              <span className="flex items-center gap-3 text-slate-300">
                <span className={`size-3 rounded-full ${color}`} />
                {label}
              </span>
              <span className="font-black text-white">{value}</span>
            </div>
          ))}
        </div>
      </div>
      <a className="mt-5 block border-t border-slate-800/80 pt-4 text-right text-sm font-black text-cyan-400 hover:text-cyan-300" href="#">
        View full report →
      </a>
    </GlowCard>
  );
}
