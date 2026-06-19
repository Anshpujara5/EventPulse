import { GlowCard } from "@/components/common/GlowCard";
import { apiSummary } from "./dashboard-data";

export function ProjectSummaryCard() {
  return (
    <GlowCard className="p-5">
      <h2 className="text-lg font-black">Project & API Summary</h2>
      <div className="mt-4 grid gap-3">
        {apiSummary.map(([label, value]) => (
          <div className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/25 px-4 py-3 text-sm" key={label}>
            <span className="text-slate-400">{label}</span>
            <span className="font-black text-white">{value}</span>
          </div>
        ))}
      </div>
    </GlowCard>
  );
}
