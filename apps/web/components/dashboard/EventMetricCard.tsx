import { GlowCard } from "@/components/common/GlowCard";
import { Icon } from "@/components/common/Icon";
import type { eventMetrics } from "./events-data";

export function EventMetricCard({
  metric,
}: {
  metric: (typeof eventMetrics)[number];
}) {
  return (
    <GlowCard className="p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-slate-400">{metric.label}</p>
          <p className="mt-3 text-3xl font-black tracking-tight text-white">
            {metric.value}
          </p>
          <p className="mt-2 text-sm font-medium text-slate-500">
            {metric.detail}
          </p>
        </div>
        <div
          className={`flex size-12 items-center justify-center rounded-xl border ${metric.boxClassName} ${metric.tone}`}
        >
          <Icon name={metric.icon} />
        </div>
      </div>
    </GlowCard>
  );
}
