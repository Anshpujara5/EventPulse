import { GlowCard } from "@/components/common/GlowCard";
import { Icon } from "@/components/common/Icon";
import type { ShopperSummary } from "./analytics-types";

const SHOPPER_METRICS: {
  key: keyof ShopperSummary;
  label: string;
  tone: string;
  boxClassName: string;
  icon: string;
}[] = [
  {
    key: "uniqueCustomers",
    label: "Unique Customers",
    tone: "text-cyan-300",
    boxClassName: "border-cyan-400/25 bg-cyan-500/10",
    icon: "user",
  },
  {
    key: "uniqueSessions",
    label: "Sessions",
    tone: "text-violet-300",
    boxClassName: "border-violet-400/25 bg-violet-500/10",
    icon: "activity",
  },
  {
    key: "purchasingSessions",
    label: "Purchasing Sessions",
    tone: "text-emerald-300",
    boxClassName: "border-emerald-400/25 bg-emerald-500/10",
    icon: "check",
  },
];

function formatMetricValue(value: number): string {
  return Number.isFinite(value) ? value.toLocaleString() : "—";
}

export function ShopperKpiRow({ summary }: { summary: ShopperSummary }) {
  const values = SHOPPER_METRICS.map((metric) => summary[metric.key]);
  const hasAvailableValue = values.some((value) => Number.isFinite(value));
  const hasUnavailableValue = values.some((value) => !Number.isFinite(value));
  const allAvailableValuesAreZero =
    hasAvailableValue &&
    values.every((value) => !Number.isFinite(value) || value === 0);
  const statusMessage = !hasAvailableValue
    ? "Shopper data is unavailable in this scope."
    : hasUnavailableValue
      ? "Some shopper metrics are unavailable in this scope."
      : allAvailableValuesAreZero
        ? "No shopper or session activity is available in this scope yet."
        : null;

  return (
    <section aria-labelledby="shopper-overview-heading">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <h2
          className="text-lg font-black text-white"
          id="shopper-overview-heading"
        >
          Shopper Overview
        </h2>
        <p className="text-xs text-slate-500">
          Based on events that include customerId and sessionId.
        </p>
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        {SHOPPER_METRICS.map((metric) => (
          <GlowCard className="p-4" key={metric.key}>
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <h3 className="text-xs font-medium text-slate-500">
                  {metric.label}
                </h3>
                <p className="mt-2 text-2xl font-black text-white">
                  {formatMetricValue(summary[metric.key])}
                </p>
              </div>
              <div
                aria-hidden="true"
                className={`flex size-10 shrink-0 items-center justify-center rounded-full border ${metric.boxClassName} ${metric.tone}`}
              >
                <Icon name={metric.icon} className="size-5" />
              </div>
            </div>
          </GlowCard>
        ))}
      </div>

      {statusMessage && (
        <p className="mt-3 text-xs text-slate-500">{statusMessage}</p>
      )}
    </section>
  );
}
