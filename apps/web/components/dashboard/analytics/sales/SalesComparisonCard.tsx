import { GlowCard } from "@/components/common/GlowCard";
import type {
  ComparisonDirection,
  SalesMetricComparison,
  SalesTabData,
} from "../analytics-types";
import {
  formatCount,
  formatMoney,
  formatNumber,
  formatOrderBasis,
} from "./sales-formatters";

const DIRECTION_STYLES: Record<ComparisonDirection, string> = {
  up: "border-emerald-400/25 bg-emerald-500/10 text-emerald-300",
  down: "border-rose-400/25 bg-rose-500/10 text-rose-300",
  flat: "border-slate-600/40 bg-slate-800/40 text-slate-300",
  new: "border-cyan-400/25 bg-cyan-500/10 text-cyan-300",
  no_data: "border-slate-700/50 bg-slate-800/30 text-slate-400",
};

function directionText(comparison: SalesMetricComparison): string {
  if (comparison.previous === null) {
    return "Previous period unavailable";
  }

  if (comparison.changePercent === null) {
    return comparison.direction === "new"
      ? "New activity"
      : "No activity in either period";
  }

  if (comparison.direction === "up") {
    return `Increase · ${formatNumber(Math.abs(comparison.changePercent))}%`;
  }
  if (comparison.direction === "down") {
    return `Decrease · ${formatNumber(Math.abs(comparison.changePercent))}%`;
  }
  if (comparison.direction === "flat") {
    return comparison.changePercent === 0
      ? "No change"
      : `Stable · ${comparison.changePercent > 0 ? "+" : ""}${formatNumber(comparison.changePercent)}%`;
  }

  return "Previous period unavailable";
}

interface ComparisonRowProps {
  basis: string;
  comparison: SalesMetricComparison | null;
  formatValue: (value: number) => string;
  label: string;
}

function ComparisonRow({
  basis,
  comparison,
  formatValue,
  label,
}: ComparisonRowProps) {
  if (!comparison) {
    return (
      <div className="rounded-xl border border-slate-800 bg-slate-950/45 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-black text-white">{label}</h3>
          <span className="rounded-full border border-slate-700 bg-slate-800/50 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-slate-400">
            Unavailable
          </span>
        </div>
        <p className="mt-2 text-xs text-slate-500">{basis}</p>
      </div>
    );
  }

  return (
    <div className="min-w-0 rounded-xl border border-slate-800 bg-slate-950/45 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-sm font-black text-white">{label}</h3>
          <p className="mt-1 break-words text-xs text-slate-500">{basis}</p>
        </div>
        <span
          className={`rounded-full border px-2 py-1 text-[10px] font-black uppercase tracking-wide ${DIRECTION_STYLES[comparison.direction]}`}
        >
          {directionText(comparison)}
        </span>
      </div>
      <dl className="mt-4 grid grid-cols-2 gap-4">
        <div>
          <dt className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
            Current
          </dt>
          <dd className="mt-1 break-words font-black text-white">
            {formatValue(comparison.current)}
          </dd>
        </div>
        <div>
          <dt className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
            Previous
          </dt>
          <dd className="mt-1 break-words font-black text-white">
            {comparison.previous === null
              ? "—"
              : formatValue(comparison.previous)}
          </dd>
        </div>
      </dl>
      <p className="mt-3 text-[11px] leading-4 text-slate-500">
        {comparison.label}
      </p>
    </div>
  );
}

export function SalesComparisonCard({
  comparison,
}: {
  comparison: SalesTabData["comparison"];
}) {
  return (
    <GlowCard className="min-w-0 p-5">
      <h2 className="text-lg font-black text-white">Previous-period comparison</h2>
      <p className="mt-1 text-xs leading-5 text-slate-500">
        Each metric keeps the basis and currency supplied by the API.
      </p>
      <div className="mt-4 grid gap-3 lg:grid-cols-3">
        <ComparisonRow
          basis={
            comparison.orders
              ? formatOrderBasis(comparison.orders.basis)
              : "A comparable order basis is unavailable."
          }
          comparison={comparison.orders}
          formatValue={formatCount}
          label="Orders"
        />
        <ComparisonRow
          basis={
            comparison.gmv
              ? `${comparison.gmv.currency} tracked GMV`
              : "Comparable GMV is unavailable."
          }
          comparison={comparison.gmv}
          formatValue={(value) =>
            comparison.gmv
              ? formatMoney(value, comparison.gmv.currency)
              : "—"
          }
          label="GMV"
        />
        <ComparisonRow
          basis={
            comparison.aov
              ? `${comparison.aov.currency} across money-bearing orders`
              : "Comparable AOV is unavailable."
          }
          comparison={comparison.aov}
          formatValue={(value) =>
            comparison.aov
              ? formatMoney(value, comparison.aov.currency)
              : "—"
          }
          label="Average order value"
        />
      </div>
    </GlowCard>
  );
}
