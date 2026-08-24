import { GlowCard } from "@/components/common/GlowCard";
import { Icon } from "@/components/common/Icon";
import type {
  ShopperCoverage,
  TopShoppers,
} from "../analytics-types";
import {
  formatShopperCount,
  formatShopperPercent,
} from "./shopper-formatters";

export function ShopperCoverageNotice({
  coverage,
  topShoppers,
}: {
  coverage: ShopperCoverage;
  topShoppers: TopShoppers;
}) {
  const coverageIncomplete =
    coverage.eventsWithCustomerId < coverage.eventsInScope;
  const unattributedOrders =
    topShoppers.status === "available" ? topShoppers.unattributedOrders : 0;

  if (!coverageIncomplete && unattributedOrders === 0) {
    return null;
  }

  return (
    <GlowCard className="min-w-0 p-5">
      <div className="flex items-start gap-3">
        <div
          aria-hidden="true"
          className="flex size-10 shrink-0 items-center justify-center rounded-full border border-amber-400/25 bg-amber-500/10 text-amber-300"
        >
          <Icon className="size-5" name="shield" />
        </div>
        <div className="min-w-0">
          <h2 className="text-lg font-black text-white">
            Shopper data coverage
          </h2>
          {coverageIncomplete && (
            <p className="mt-1 break-words text-xs leading-5 text-slate-400">
              Shopper metrics exclude events without a usable customerId. {formatShopperCount(coverage.eventsWithCustomerId)} of {formatShopperCount(coverage.eventsInScope)} scoped events include one
              {coverage.excludedPercent === null
                ? "."
                : `; ${formatShopperPercent(coverage.excludedPercent)} are excluded.`}
            </p>
          )}
          {unattributedOrders > 0 && (
            <p className="mt-2 break-words text-xs leading-5 text-slate-400">
              {formatShopperCount(unattributedOrders)} confirmed {unattributedOrders === 1 ? "Order remains" : "Orders remain"} valid for Sales but cannot be assigned to a shopper because the identity representative has no usable customerId.
            </p>
          )}
        </div>
      </div>
    </GlowCard>
  );
}
