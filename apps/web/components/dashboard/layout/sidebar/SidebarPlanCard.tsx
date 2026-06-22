import { GlowCard } from "@/components/common/GlowCard";
import { Icon } from "@/components/common/Icon";

export function SidebarPlanCard() {
  return (
    <GlowCard className="mb-4 p-4">
      <div className="flex items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-full bg-violet-500/15 text-violet-300">
          <Icon name="shield" />
        </div>
        <div>
          <p className="text-xs text-slate-500">You&apos;re on</p>
          <p className="font-bold text-white">Pro Plan</p>
        </div>
      </div>
      <p className="mt-4 text-xs text-slate-500">Events this month</p>
      <div className="mt-1 flex items-center justify-between text-xs">
        <span>125K / 1M</span>
        <span className="text-slate-500">12%</span>
      </div>
      <div className="mt-2 h-2 rounded-full bg-slate-800">
        <div className="h-full w-[12%] rounded-full bg-blue-500" />
      </div>
      <button className="mt-4 w-full rounded-lg bg-violet-600/25 px-4 py-2 text-sm font-bold text-violet-100" type="button">
        Upgrade Plan →
      </button>
    </GlowCard>
  );
}
