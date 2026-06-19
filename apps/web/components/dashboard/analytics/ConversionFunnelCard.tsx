import { GlowCard } from "@/components/common/GlowCard";
import { Icon } from "@/components/common/Icon";
import { funnelSteps } from "./analytics-data";

export function ConversionFunnelCard() {
  return (
    <GlowCard className="p-5">
      <h2 className="text-lg font-black text-white">Conversion Funnel</h2>
      <div className="mt-5 grid gap-4">
        {funnelSteps.map(([label, value, width, gradient, icon]) => (
          <div className="grid grid-cols-[130px_1fr_44px] items-center gap-3 text-sm" key={label}>
            <span className="flex items-center gap-2 text-slate-300">
              <Icon name={icon} className="size-4 text-slate-400" />
              {label}
            </span>
            <div className="h-7 overflow-hidden rounded-md bg-slate-900/80">
              <div className={`h-full rounded-md bg-linear-to-r ${gradient} ${width}`} />
            </div>
            <span className="text-right font-bold text-white">{value}</span>
          </div>
        ))}
      </div>
    </GlowCard>
  );
}
