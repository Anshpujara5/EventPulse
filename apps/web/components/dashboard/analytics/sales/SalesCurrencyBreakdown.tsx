import { GlowCard } from "@/components/common/GlowCard";
import type { SalesMoneyMeasurement } from "../analytics-types";
import {
  formatCount,
  formatMoney,
  formatPercent,
} from "./sales-formatters";

export function SalesCurrencyBreakdown({
  money,
}: {
  money: SalesMoneyMeasurement;
}) {
  if (money.status !== "available") {
    return null;
  }

  const mixed = money.currencies.length > 1;

  return (
    <GlowCard className="min-w-0 p-5">
      <div>
        <h2 className="text-lg font-black text-white">Currency breakdown</h2>
        <p className="mt-1 text-xs leading-5 text-slate-500">
          {mixed
            ? "Per-currency tracked values. Currencies are never summed or converted."
            : "Tracked values for the currency observed in this scope."}
        </p>
      </div>

      <div className="mt-4 space-y-2">
        {money.currencies.map((slice) => (
          <div
            className="grid min-w-0 grid-cols-2 gap-3 rounded-xl border border-slate-800 bg-slate-950/45 p-4 sm:grid-cols-4"
            key={slice.currency}
          >
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
                Currency
              </p>
              <p className="mt-1 font-black text-cyan-200">{slice.currency}</p>
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
                GMV
              </p>
              <p className="mt-1 break-words font-black text-white">
                {formatMoney(slice.gmv, slice.currency)}
              </p>
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
                AOV
              </p>
              <p className="mt-1 break-words font-black text-white">
                {formatMoney(slice.aov, slice.currency)}
              </p>
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
                Orders with money
              </p>
              <p className="mt-1 font-black text-white">
                {formatCount(slice.moneyBearingOrders)}
                <span className="ml-1.5 text-xs font-medium text-slate-500">
                  ({formatPercent(slice.orderSharePercent)})
                </span>
              </p>
            </div>
          </div>
        ))}
      </div>
    </GlowCard>
  );
}
