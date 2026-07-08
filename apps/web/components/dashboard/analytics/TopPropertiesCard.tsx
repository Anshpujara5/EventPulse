import { GlowCard } from "@/components/common/GlowCard";
import { Icon } from "@/components/common/Icon";
import type { TopProperty } from "./analytics-types";

export function TopPropertiesCard({ properties }: { properties: TopProperty[] }) {
  const maxCount = properties[0]?.count ?? 1;

  return (
    <GlowCard className="p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-black text-white">Top Property Keys</h2>
        <span className="text-xs text-slate-500">By usage</span>
      </div>

      {properties.length === 0 ? (
        <p className="mt-6 text-center text-sm text-slate-500">
          No event properties in this scope.
        </p>
      ) : (
        <div className="mt-4 divide-y divide-slate-800/80">
          {properties.map((prop, index) => {
            const barPct = Math.max((prop.count / maxCount) * 100, 4);
            return (
              <div className="py-3" key={prop.key}>
                <div className="grid grid-cols-[24px_1fr_auto] items-center gap-3 text-sm">
                  <span className="font-bold text-slate-500">{index + 1}</span>
                  <span className="flex min-w-0 items-center gap-3">
                    <span className="flex size-7 shrink-0 items-center justify-center rounded-lg border border-slate-700/80 bg-slate-950/60 text-amber-400">
                      <Icon className="size-3.5" name="code" />
                    </span>
                    <span className="truncate font-mono font-bold text-slate-200">
                      {prop.key}
                    </span>
                  </span>
                  <span className="font-black text-white">
                    {prop.count.toLocaleString()}
                  </span>
                </div>
                <div className="mt-2 ml-9 h-1 rounded-full bg-slate-800">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-amber-500 to-amber-300"
                    style={{ width: `${barPct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </GlowCard>
  );
}
