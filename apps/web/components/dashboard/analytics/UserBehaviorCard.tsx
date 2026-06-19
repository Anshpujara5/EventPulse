import { GlowCard } from "@/components/common/GlowCard";
import { Icon } from "@/components/common/Icon";
import { behaviorRows } from "./analytics-data";

export function UserBehaviorCard() {
  return (
    <GlowCard className="p-5">
      <h2 className="text-lg font-black text-white">User Behavior</h2>
      <div className="mt-5 divide-y divide-slate-800/80">
        {behaviorRows.map(([label, value, icon, tone]) => (
          <div className="flex items-center justify-between gap-4 py-4 first:pt-0 last:pb-0" key={label}>
            <span className="flex items-center gap-3 text-sm text-slate-300">
              <Icon name={icon} className={`size-5 ${tone}`} />
              {label}
            </span>
            <span className="text-lg font-black text-white">{value}</span>
          </div>
        ))}
      </div>
    </GlowCard>
  );
}
