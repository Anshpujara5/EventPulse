import { GlowCard } from "@/components/common/GlowCard";
import { Icon } from "@/components/common/Icon";
import type { SalesTabData } from "../analytics-types";
import {
  formatCount,
  formatMoney,
  formatOrderBasis,
} from "./sales-formatters";

interface HeadlineCardProps {
  detail: string;
  icon: string;
  label: string;
  note?: string;
  status?: string;
  tone: string;
  value: string;
}

function HeadlineCard({
  detail,
  icon,
  label,
  note,
  status,
  tone,
  value,
}: HeadlineCardProps) {
  return (
    <GlowCard className="min-w-0 p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-sm font-medium text-slate-400">{label}</h2>
            {status && (
              <span className="rounded-full border border-amber-400/25 bg-amber-500/10 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-amber-300">
                {status}
              </span>
            )}
          </div>
          <p className="mt-3 break-words text-3xl font-black text-white">
            {value}
          </p>
          <p className="mt-2 break-words text-xs font-bold leading-5 text-slate-300">
            {detail}
          </p>
          {note && (
            <p className="mt-1.5 break-words text-xs leading-5 text-slate-500">
              {note}
            </p>
          )}
        </div>
        <div
          aria-hidden="true"
          className={`flex size-11 shrink-0 items-center justify-center rounded-full border ${tone}`}
        >
          <Icon className="size-5" name={icon} />
        </div>
      </div>
    </GlowCard>
  );
}

export function SalesHeadlineCards({ data }: { data: SalesTabData }) {
  const { money, orders } = data;
  const orderValue =
    orders.status === "unavailable" ? "—" : formatCount(orders.value);
  const orderDetail =
    orders.status === "unavailable"
      ? orders.label
      : orders.status === "estimated"
        ? orders.label
        : formatOrderBasis(orders.basis);
  const orderNote =
    orders.status === "confirmed"
      ? undefined
      : orders.status === "estimated"
        ? `${formatOrderBasis(orders.basis)}. ${orders.unlockGuidance}`
        : orders.unlockGuidance;
  const mixedCurrencyNote =
    money.status === "available" && money.otherCurrencyCount > 0
      ? `${money.dominantCurrency} only — ${formatCount(money.otherCurrencyOrders)} tracked ${money.otherCurrencyOrders === 1 ? "order uses" : "orders use"} ${formatCount(money.otherCurrencyCount)} other ${money.otherCurrencyCount === 1 ? "currency" : "currencies"}.`
      : undefined;

  return (
    <section
      aria-label="Sales headline metrics"
      className="grid min-w-0 gap-4 lg:grid-cols-3"
    >
      <HeadlineCard
        detail={orderDetail}
        icon="cube"
        label={orders.status === "estimated" ? "Orders estimate" : "Orders"}
        note={orderNote}
        status={orders.status === "estimated" ? "Estimated" : undefined}
        tone="border-cyan-400/25 bg-cyan-500/10 text-cyan-300"
        value={orderValue}
      />
      <HeadlineCard
        detail={
          money.status === "available"
            ? money.otherCurrencyCount > 0
              ? "Dominant tracked currency"
              : "Tracked GMV"
            : "GMV unavailable"
        }
        icon="chart"
        label="GMV"
        note={
          money.status === "available"
            ? mixedCurrencyNote
            : money.unlockGuidance
        }
        tone="border-violet-400/25 bg-violet-500/10 text-violet-300"
        value={
          money.status === "available"
            ? formatMoney(money.headlineGmv, money.dominantCurrency)
            : "—"
        }
      />
      <HeadlineCard
        detail={
          money.status === "available" ? money.aovBasisNote : "AOV unavailable"
        }
        icon="activity"
        label="Average order value"
        note={money.status === "unavailable" ? money.unlockGuidance : undefined}
        tone="border-emerald-400/25 bg-emerald-500/10 text-emerald-300"
        value={
          money.status === "available"
            ? formatMoney(money.headlineAov, money.dominantCurrency)
            : "—"
        }
      />
    </section>
  );
}
