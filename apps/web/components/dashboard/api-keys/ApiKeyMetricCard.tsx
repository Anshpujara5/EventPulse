import { GlowCard } from "@/components/common/GlowCard";
import { Icon } from "@/components/common/Icon";

export type ApiKeyMetric = {
  boxClassName: string;
  deltaContext: string;
  icon: string;
  label: string;
  negative: boolean;
  spark: string;
  tone: string;
  value: string;
};

export function ApiKeyMetricCard({
  metric,
}: {
  metric: ApiKeyMetric;
}) {
  return (
    <GlowCard className="p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-slate-400">{metric.label}</p>
          <p className="mt-3 text-3xl font-black tracking-tight text-white">
            {metric.value}
          </p>
          <p
            className={`mt-2 text-sm font-bold ${
              metric.negative ? "text-rose-400" : "text-emerald-400"
            }`}
          >
            {metric.negative ? "↓" : "↑"}{" "}
            <span className="font-medium text-slate-500">{metric.deltaContext}</span>
          </p>
        </div>
        <div
          className={`flex size-12 items-center justify-center rounded-xl border ${metric.boxClassName} ${metric.tone}`}
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
