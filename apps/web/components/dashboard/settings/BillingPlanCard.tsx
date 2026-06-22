import { GlowCard } from "@/components/common/GlowCard";
import { Icon } from "@/components/common/Icon";
import { billingUsage } from "./settings-data";

export function BillingPlanCard() {
  return (
    <GlowCard className="p-5">
      <div className="flex items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-xl bg-blue-500/10 text-cyan-300">
          <Icon name="database" />
        </div>
        <h2 className="text-lg font-black text-white">Billing / Plan</h2>
      </div>

      <div className="mt-6 flex items-center justify-between border-b border-slate-800/80 pb-4">
        <span className="text-sm text-slate-400">Current Plan</span>
        <span className="flex items-center gap-2 text-sm font-black text-white">
          <Icon name="shield" className="size-5 text-violet-400" />
          Pro Plan
        </span>
      </div>

      <div className="mt-5 space-y-5">
        {billingUsage.map((item) => (
          <div key={item.label}>
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-400">{item.label}</span>
              <span className="font-bold text-white">{item.value}</span>
              <span className="text-slate-500">{item.percent}</span>
            </div>
            <div className="mt-2 h-2 rounded-full bg-slate-800">
              <div className={`h-full rounded-full bg-blue-500 ${item.width}`} />
            </div>
          </div>
        ))}
      </div>

      <div className="mt-5 flex items-center justify-between border-t border-slate-800/80 pt-4 text-sm">
        <span className="text-slate-400">Renewal</span>
        <span className="font-black text-white">Jul 18, 2026</span>
      </div>

      <div className="mt-6 flex justify-center">
        <button className="h-11 rounded-xl bg-linear-to-r from-blue-600 to-violet-600 px-6 text-sm font-black text-white shadow-[0_0_24px_rgba(79,70,229,0.25)]" type="button">
          Upgrade Plan
        </button>
      </div>
    </GlowCard>
  );
}
