import { GlowCard } from "@/components/common/GlowCard";
import { apiKeys } from "./dashboard-data";

export function ApiKeyUsageCard() {
  return (
    <GlowCard className="p-5">
      <div className="mb-5 flex items-center justify-between">
        <h2 className="text-lg font-black">API Key Usage</h2>
        <span className="rounded-lg border border-slate-700 px-3 py-1 text-xs text-slate-400">Top 5</span>
      </div>
      <div className="space-y-4">
        {apiKeys.map(([keyName, count, width]) => (
          <div key={keyName}>
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="text-slate-300">{keyName}</span>
              <span className="font-bold text-white">{count}</span>
            </div>
            <div className="h-2 rounded-full bg-slate-800">
              <div className={`h-full rounded-full bg-linear-to-r from-cyan-400 to-blue-600 ${width}`} />
            </div>
          </div>
        ))}
      </div>
      <div className="mt-5 flex items-center justify-between border-t border-slate-800 pt-4">
        <span className="text-slate-400">Total Requests</span>
        <span className="text-2xl font-black">114.4K</span>
      </div>
    </GlowCard>
  );
}
