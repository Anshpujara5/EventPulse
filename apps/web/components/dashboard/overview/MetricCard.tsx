import { GlowCard } from "@/components/common/GlowCard";
import { Icon } from "@/components/common/Icon";
import type { metrics } from "./dashboard-data";

export function MetricCard({ metric }: { metric: (typeof metrics)[number] }) {
  return (
    <GlowCard className="p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-slate-400">{metric.label}</p>
          <p className="mt-3 text-3xl font-black tracking-tight text-white">{metric.value}</p>
          <p className={`mt-2 text-sm font-bold ${metric.deltaTone}`}>
            ↑ {metric.delta} <span className="font-medium text-slate-500">vs last 24h</span>
          </p>
        </div>
        <div className="flex size-10 items-center justify-center rounded-full border border-blue-400/20 bg-blue-500/10 text-cyan-400">
          <Icon name={metric.icon} />
        </div>
      </div>
      <svg className="mt-4 h-12 w-full text-blue-400" viewBox="0 0 110 44">
        <path
          d={metric.spark}
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
        />
      </svg>
    </GlowCard>
  );
}
