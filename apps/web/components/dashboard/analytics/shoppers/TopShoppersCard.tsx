import { GlowCard } from "@/components/common/GlowCard";
import { Icon } from "@/components/common/Icon";
import type { TopShoppers } from "../analytics-types";
import {
  formatShopperCount,
  formatShopperMoney,
} from "./shopper-formatters";

export function TopShoppersCard({
  topShoppers,
}: {
  topShoppers: TopShoppers;
}) {
  if (topShoppers.status === "unavailable") {
    return (
      <GlowCard className="min-w-0 p-5">
        <div className="flex items-start gap-3">
          <div
            aria-hidden="true"
            className="flex size-10 shrink-0 items-center justify-center rounded-full border border-amber-400/25 bg-amber-500/10 text-amber-300"
          >
            <Icon className="size-5" name="lock" />
          </div>
          <div className="min-w-0">
            <h2 className="text-lg font-black text-white">Top Shoppers</h2>
            <p className="mt-1 text-sm font-bold text-amber-200">
              Confirmed-order ranking unavailable
            </p>
            <p className="mt-1 break-words text-xs leading-5 text-slate-500">
              {topShoppers.message}
            </p>
          </div>
        </div>
      </GlowCard>
    );
  }

  return (
    <GlowCard className="min-w-0 overflow-hidden">
      <div className="p-5">
        <h2 className="text-lg font-black text-white">Top Shoppers</h2>
        <p className="mt-1 text-xs leading-5 text-slate-500">
          Ranked by confirmed Orders, then sessions. Customer IDs are
          pseudonymous, store-provided identifiers and remain project-scoped.
        </p>
        {topShoppers.currency === null ? (
          <p className="mt-2 text-xs text-slate-500">
            GMV is unavailable; confirmed Orders ranking remains available.
          </p>
        ) : (
          <p className="mt-2 text-xs text-slate-500">
            GMV is shown in the dominant tracked currency, {topShoppers.currency},
            only. Currencies are never combined or converted.
            {topShoppers.ordersExcludedForCurrency > 0 &&
              ` ${formatShopperCount(topShoppers.ordersExcludedForCurrency)} other-currency ${topShoppers.ordersExcludedForCurrency === 1 ? "order was" : "orders were"} excluded from GMV.`}
          </p>
        )}
      </div>

      {topShoppers.rows.length === 0 ? (
        <div className="mx-5 mb-5 rounded-xl border border-slate-800 bg-slate-950/30 px-4 py-8 text-center">
          <p className="text-sm text-slate-500">
            No confirmed shopper Orders are available for this scope.
          </p>
        </div>
      ) : (
        <ol className="divide-y divide-slate-800/80 border-t border-slate-800/80">
          {topShoppers.rows.map((shopper, index) => (
            <li
              className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)] gap-3 px-5 py-4 sm:grid-cols-[auto_minmax(0,1fr)_minmax(260px,0.8fr)] sm:items-center"
              key={`${shopper.projectId}:${shopper.customerId}`}
            >
              <span
                aria-hidden="true"
                className="flex size-8 items-center justify-center rounded-full border border-cyan-400/20 bg-cyan-500/10 text-xs font-black text-cyan-200"
              >
                {index + 1}
              </span>
              <div className="min-w-0">
                <p
                  className="truncate font-mono text-sm font-black text-slate-100"
                  title={shopper.customerId}
                >
                  {shopper.customerId}
                </p>
                <p
                  className="mt-1 truncate text-xs text-slate-500"
                  title={shopper.projectName}
                >
                  Project: {shopper.projectName}
                </p>
              </div>
              <div className="col-span-2 grid grid-cols-3 gap-2 sm:col-span-1">
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
                    Orders
                  </p>
                  <p className="mt-1 font-black text-white">
                    {formatShopperCount(shopper.confirmedOrders)}
                  </p>
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
                    Sessions
                  </p>
                  <p className="mt-1 font-black text-white">
                    {formatShopperCount(shopper.sessions)}
                  </p>
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
                    GMV
                  </p>
                  <p
                    className="mt-1 truncate font-black text-white"
                    title={
                      shopper.gmv === null || topShoppers.currency === null
                        ? "GMV unavailable"
                        : formatShopperMoney(
                            shopper.gmv,
                            topShoppers.currency,
                          )
                    }
                  >
                    {shopper.gmv === null || topShoppers.currency === null
                      ? "—"
                      : formatShopperMoney(shopper.gmv, topShoppers.currency)}
                  </p>
                </div>
              </div>
            </li>
          ))}
        </ol>
      )}
    </GlowCard>
  );
}
