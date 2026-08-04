import { GlowCard } from "@/components/common/GlowCard";
import { Icon } from "@/components/common/Icon";
import type {
  ComparisonDirection,
  OverviewAovKpi,
  OverviewGmvKpi,
  OverviewOrdersKpi,
  SalesMetricComparison,
} from "./analytics-types";
import {
  formatCount,
  formatMoney,
  formatNumber,
  formatOrderBasis,
} from "./sales/sales-formatters";

const DIRECTION_STYLES: Record<ComparisonDirection, string> = {
  up: "border-emerald-400/25 bg-emerald-500/10 text-emerald-300",
  down: "border-rose-400/25 bg-rose-500/10 text-rose-300",
  flat: "border-slate-600/40 bg-slate-800/40 text-slate-300",
  new: "border-cyan-400/25 bg-cyan-500/10 text-cyan-300",
  no_data: "border-slate-700/50 bg-slate-800/30 text-slate-400",
};

function comparisonText(comparison: SalesMetricComparison): string {
  if (comparison.previous === null) return "— Previous period unavailable";
  if (comparison.changePercent === null) {
    return comparison.direction === "new"
      ? "↑ New activity"
      : "— No activity in either period";
  }
  if (comparison.direction === "up") {
    return `↑ ${formatNumber(Math.abs(comparison.changePercent))}%`;
  }
  if (comparison.direction === "down") {
    return `↓ ${formatNumber(Math.abs(comparison.changePercent))}%`;
  }
  return comparison.changePercent === 0
    ? "→ No change"
    : `→ Stable (${comparison.changePercent > 0 ? "+" : ""}${formatNumber(comparison.changePercent)}%)`;
}

function SalesComparisonChip({
  comparison,
}: {
  comparison: SalesMetricComparison;
}) {
  const text = comparisonText(comparison);

  return (
    <span
      aria-label={`${text}. ${comparison.label}.`}
      className={`mt-2 inline-flex max-w-full rounded-full border px-2 py-1 text-[11px] font-bold leading-4 ${DIRECTION_STYLES[comparison.direction]}`}
      title={`${text}. ${comparison.label}.`}
    >
      <span className="min-w-0 break-words whitespace-normal">{text}</span>
    </span>
  );
}

interface SalesKpiCardProps {
  badge?: string;
  comparison: SalesMetricComparison | null;
  detail: string;
  icon: string;
  label: string;
  note?: string;
  tone: string;
  value: string;
}

function SalesKpiCard({
  badge,
  comparison,
  detail,
  icon,
  label,
  note,
  tone,
  value,
}: SalesKpiCardProps) {
  return (
    <GlowCard className="min-w-0 p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-medium text-slate-400">{label}</p>
            {badge && (
              <span className="rounded-full border border-amber-400/25 bg-amber-500/10 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-amber-300">
                {badge}
              </span>
            )}
          </div>
          <p className="mt-3 break-words text-3xl font-black tracking-tight text-white">
            {value}
          </p>
          {comparison && <SalesComparisonChip comparison={comparison} />}
          <p className="mt-2 break-words text-sm text-slate-500">{detail}</p>
          {note && (
            <p className="mt-1.5 break-words text-xs leading-5 text-slate-500">
              {note}
            </p>
          )}
        </div>
        <div
          aria-hidden="true"
          className={`flex size-12 shrink-0 items-center justify-center rounded-full border ${tone}`}
        >
          <Icon name={icon} />
        </div>
      </div>
    </GlowCard>
  );
}

export function OverviewSalesMetricCards({
  orders,
  gmv,
  aov,
}: {
  orders: OverviewOrdersKpi;
  gmv: OverviewGmvKpi;
  aov: OverviewAovKpi;
}) {
  const ordersAvailable = orders.status !== "unavailable";
  const mixedCurrencyNote =
    gmv.status === "available" && gmv.otherCurrencyCount > 0
      ? `${gmv.currency} only — ${formatCount(gmv.otherCurrencyOrders)} tracked ${gmv.otherCurrencyOrders === 1 ? "order uses" : "orders use"} ${formatCount(gmv.otherCurrencyCount)} other ${gmv.otherCurrencyCount === 1 ? "currency" : "currencies"}.`
      : undefined;

  return (
    <section
      aria-label="Sales overview metrics"
      className="mt-4 grid min-w-0 gap-4 md:grid-cols-2 xl:grid-cols-3"
    >
      <SalesKpiCard
        badge={orders.status === "estimated" ? "Estimated" : undefined}
        comparison={orders.comparison}
        detail={
          ordersAvailable
            ? orders.status === "estimated"
              ? orders.label
              : formatOrderBasis(orders.basis)
            : orders.label
        }
        icon="cube"
        label="Orders"
        note={orders.unlockGuidance ?? undefined}
        tone="border-cyan-400/25 bg-cyan-500/10 text-cyan-300"
        value={ordersAvailable ? formatCount(orders.value) : "—"}
      />
      <SalesKpiCard
        comparison={gmv.comparison}
        detail={
          gmv.status === "available"
            ? gmv.otherCurrencyCount > 0
              ? "Dominant tracked currency"
              : "Tracked GMV"
            : "GMV unavailable"
        }
        icon="chart"
        label="GMV"
        note={
          gmv.status === "available"
            ? mixedCurrencyNote
            : gmv.unlockGuidance
        }
        tone="border-violet-400/25 bg-violet-500/10 text-violet-300"
        value={
          gmv.status === "available"
            ? formatMoney(gmv.value, gmv.currency)
            : "—"
        }
      />
      <SalesKpiCard
        comparison={aov.comparison}
        detail={
          aov.status === "available" ? aov.basisNote : "AOV unavailable"
        }
        icon="activity"
        label="Average Order Value"
        note={aov.status === "unavailable" ? aov.unlockGuidance : undefined}
        tone="border-emerald-400/25 bg-emerald-500/10 text-emerald-300"
        value={
          aov.status === "available"
            ? formatMoney(aov.value, aov.currency)
            : "—"
        }
      />
    </section>
  );
}
