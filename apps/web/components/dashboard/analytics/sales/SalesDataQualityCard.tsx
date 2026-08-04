import { GlowCard } from "@/components/common/GlowCard";
import type { SalesDataQuality } from "../analytics-types";
import {
  formatCount,
  formatPercent,
} from "./sales-formatters";

interface QualityMetric {
  detail: string;
  label: string;
  value: number;
}

function gapMetrics(quality: SalesDataQuality): QualityMetric[] {
  return [
    {
      label: "Payment-only order IDs",
      value: quality.paymentOnlyOrderIds,
      detail: "Payment evidence without a matching purchase fact.",
    },
    {
      label: "Purchase events missing order_id",
      value: quality.missingOrderIdPurchaseEvents,
      detail: "Add order_id for exact order counting.",
    },
    {
      label: "Orders without valid money",
      value: quality.ordersWithoutMoney,
      detail: "Excluded from GMV and AOV.",
    },
    {
      label: "Missing amount",
      value: quality.missingAmountOrders,
      detail: "Confirmed orders without amount evidence.",
    },
    {
      label: "Invalid amount",
      value: quality.invalidAmountOrders,
      detail: "Amounts that do not match the tracking contract.",
    },
    {
      label: "Negative amount",
      value: quality.negativeAmountOrders,
      detail: "Negative purchase amounts are not valid GMV evidence.",
    },
    {
      label: "Missing currency",
      value: quality.missingCurrencyOrders,
      detail: "Valid amounts without a currency code.",
    },
    {
      label: "Invalid currency",
      value: quality.invalidCurrencyOrders,
      detail: "Currency must be an uppercase three-letter code.",
    },
    {
      label: "Conflicting money evidence",
      value: quality.conflictingMoneyEvidence,
      detail: "One order has more than one valid amount/currency pair.",
    },
  ];
}

export function SalesDataQualityCard({
  quality,
}: {
  quality: SalesDataQuality;
}) {
  return (
    <GlowCard className="min-w-0 p-5">
      <div>
        <h2 className="text-lg font-black text-white">Sales data quality</h2>
        <p className="mt-1 text-xs leading-5 text-slate-500">
          Tracking coverage and actionable gaps in this scope.
        </p>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-800 bg-slate-950/45 p-4">
          <p className="text-xs font-bold text-slate-500">Purchase events</p>
          <p className="mt-2 text-2xl font-black text-white">
            {formatCount(quality.purchaseEvents)}
          </p>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-950/45 p-4">
          <p className="text-xs font-bold text-slate-500">With order_id</p>
          <p className="mt-2 text-2xl font-black text-white">
            {formatCount(quality.purchaseEventsWithOrderId)}
          </p>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-950/45 p-4">
          <p className="text-xs font-bold text-slate-500">order_id coverage</p>
          <p className="mt-2 text-2xl font-black text-white">
            {formatPercent(quality.purchaseEventsWithOrderIdPercent)}
          </p>
        </div>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {gapMetrics(quality).map((metric) => (
          <div
            className="min-w-0 rounded-xl border border-slate-800 bg-slate-950/35 p-3"
            key={metric.label}
          >
            <div className="flex items-start justify-between gap-3">
              <p className="min-w-0 text-xs font-bold leading-5 text-slate-300">
                {metric.label}
              </p>
              <span className="shrink-0 rounded-full border border-amber-400/20 bg-amber-500/8 px-2 py-0.5 text-xs font-black text-amber-200">
                {formatCount(metric.value)}
              </span>
            </div>
            <p className="mt-1 break-words text-[11px] leading-4 text-slate-500">
              {metric.detail}
            </p>
          </div>
        ))}
      </div>
    </GlowCard>
  );
}
