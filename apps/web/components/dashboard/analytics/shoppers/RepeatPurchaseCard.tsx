import { GlowCard } from "@/components/common/GlowCard";
import { Icon } from "@/components/common/Icon";
import type { RepeatPurchase } from "../analytics-types";
import {
  formatShopperCount,
  formatShopperDecimal,
  formatShopperPercent,
} from "./shopper-formatters";

export function RepeatPurchaseCard({
  repeatPurchase,
}: {
  repeatPurchase: RepeatPurchase;
}) {
  if (repeatPurchase.status === "unavailable") {
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
            <h2 className="text-lg font-black text-white">Repeat Purchase</h2>
            <p className="mt-1 text-sm font-bold text-amber-200">
              Confirmed-order analysis unavailable
            </p>
            <p className="mt-1 break-words text-xs leading-5 text-slate-500">
              {repeatPurchase.message}
            </p>
          </div>
        </div>
      </GlowCard>
    );
  }

  const metrics = [
    {
      label: "Buyers",
      value: formatShopperCount(repeatPurchase.buyers),
    },
    {
      label: "Repeat buyers",
      value: formatShopperCount(repeatPurchase.repeatBuyers),
    },
    {
      label: "Repeat Purchase Rate",
      value: formatShopperPercent(repeatPurchase.repeatRatePercent),
    },
    {
      label: "Average Orders per Buyer",
      value:
        repeatPurchase.averageOrdersPerBuyer === null
          ? "—"
          : formatShopperDecimal(repeatPurchase.averageOrdersPerBuyer),
    },
  ];

  return (
    <GlowCard className="min-w-0 p-5">
      <h2 className="text-lg font-black text-white">Repeat Purchase</h2>
      <p className="mt-1 text-xs leading-5 text-slate-500">
        Measured from confirmed Orders with usable order_id and shopper
        identity.
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {metrics.map((metric) => (
          <div
            className="rounded-xl border border-slate-800 bg-slate-950/35 p-3"
            key={metric.label}
          >
            <p className="text-xs text-slate-500">{metric.label}</p>
            <p className="mt-1.5 text-xl font-black text-white">
              {metric.value}
            </p>
          </div>
        ))}
      </div>

      <p className="mt-3 text-xs leading-5 text-slate-500">
        Purchasing Sessions above retain their legacy session-based activity
        basis and are not used to estimate repeat Orders.
      </p>
    </GlowCard>
  );
}
