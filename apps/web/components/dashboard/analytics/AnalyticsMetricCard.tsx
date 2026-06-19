import { GlowCard } from "@/components/common/GlowCard";
import { Icon } from "@/components/common/Icon";
import type { analyticsMetrics } from "./analytics-data";

export function AnalyticsMetricCard({
  metric,
}: {
  metric: (typeof analyticsMetrics)[number];
}) {
  return (
    <GlowCard className="p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-slate-400">{metric.label}</p>
          <p className="mt-3 text-3xl font-black tracking-tight text-white">
            {metric.value}
          </p>
          <p className="mt-2 text-sm font-bold text-emerald-400">
            ↑ {metric.delta}{" "}
            <span className="font-medium text-slate-500">{metric.deltaContext}</span>
          </p>
        </div>
        <div
          className={`flex size-12 items-center justify-center rounded-full border ${metric.boxClassName} ${metric.tone}`}
        >
          <Icon name={metric.icon} />
        </div>
      </div>
      <svg className="mt-4 h-10 w-full text-blue-400" viewBox="0 0 100 44">
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
