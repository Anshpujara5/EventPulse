import { GlowCard } from "@/components/common/GlowCard";
import { Icon } from "@/components/common/Icon";
import type {
  CommerceFunnel,
  CommerceFunnelFriction,
  InsightSeverity,
} from "./analytics-types";

const SEVERITY_STYLES: Record<
  InsightSeverity,
  { icon: string; boxClassName: string; tone: string }
> = {
  info: {
    icon: "activity",
    boxClassName: "border-cyan-400/25 bg-cyan-500/10",
    tone: "text-cyan-300",
  },
  warning: {
    icon: "shield",
    boxClassName: "border-amber-400/25 bg-amber-500/10",
    tone: "text-amber-300",
  },
  critical: {
    icon: "bell",
    boxClassName: "border-rose-400/25 bg-rose-500/10",
    tone: "text-rose-300",
  },
};

const FRICTION_ITEMS: { key: keyof CommerceFunnelFriction; label: string }[] = [
  { key: "paymentFailed", label: "Payment failed" },
  { key: "outOfStock", label: "Out of stock" },
  { key: "itemUnavailable", label: "Item unavailable" },
  { key: "deliveryFeeShown", label: "Delivery fee shown" },
  { key: "etaShown", label: "ETA shown" },
  { key: "couponApplied", label: "Coupon applied" },
];

const EXAMPLE_EVENT_NAMES = [
  "product_viewed",
  "add_to_cart",
  "checkout_started",
  "purchase_completed",
] as const;

export function CommerceFunnelCard({ funnel }: { funnel: CommerceFunnel }) {
  const { steps, friction, insight } = funnel;
  const isEmpty = funnel.commerceSignalEvents === 0;
  const maxCount = Math.max(...steps.map((s) => s.count), 1);
  const style = SEVERITY_STYLES[insight.severity];

  // Case 2 (commerce events exist but no product views) gets its own concise
  // in-card wording; every other insight uses the description from the API.
  const insightDescription =
    insight.type === "missing_top_of_funnel"
      ? "Some commerce events exist, but product_viewed is missing. Add product_viewed to calculate full funnel conversion."
      : insight.description;

  // Step with the largest drop-off from its previous step, highlighted below.
  let biggestDropIndex = -1;
  let biggestDrop = 0;
  steps.forEach((step, index) => {
    if (
      step.dropOffFromPreviousPercent !== null &&
      step.dropOffFromPreviousPercent > biggestDrop
    ) {
      biggestDrop = step.dropOffFromPreviousPercent;
      biggestDropIndex = index;
    }
  });

  const frictionItems = FRICTION_ITEMS.map(({ key, label }) => ({
    label,
    count: friction[key],
  })).filter((item) => item.count > 0);

  return (
    <GlowCard className="p-5">
      <div className="flex items-center gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-full border border-emerald-400/25 bg-emerald-500/10 text-emerald-300">
          <Icon name="cube" className="size-5" />
        </div>
        <div className="min-w-0">
          <h2 className="text-lg font-black text-white">Commerce Funnel</h2>
          <p className="text-xs text-slate-500">
            Aggregate shopper journey based on standard commerce event names.
          </p>
        </div>
      </div>

      {isEmpty ? (
        <div className="mt-5 flex min-h-36 items-center justify-center rounded-xl border border-slate-800 bg-slate-950/25 px-6 py-6 text-center">
          <div>
            <p className="text-sm text-slate-400">
              No commerce funnel events in this scope yet. Send events like:
            </p>
            <div className="mt-3 flex flex-wrap justify-center gap-2">
              {EXAMPLE_EVENT_NAMES.map((name) => (
                <code
                  className="rounded-lg border border-slate-700/70 bg-slate-950/60 px-2.5 py-1 font-mono text-xs text-cyan-100"
                  key={name}
                >
                  {name}
                </code>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className="mt-3 divide-y divide-slate-800/60">
            {steps.map((step, index) => {
              const isBiggestDrop = index === biggestDropIndex && biggestDrop > 0;
              const barPct = Math.max(
                (step.count / maxCount) * 100,
                step.count > 0 ? 4 : 1,
              );
              return (
                <div className="py-3" key={step.id}>
                  <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-sm">
                    <span className="flex min-w-0 items-center gap-2 font-bold text-slate-200">
                      <span className="text-slate-500">{index + 1}.</span>
                      <span className="truncate">{step.label}</span>
                      {isBiggestDrop && (
                        <span className="shrink-0 rounded-full border border-rose-400/25 bg-rose-500/10 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-rose-300">
                          Biggest drop-off
                        </span>
                      )}
                    </span>
                    <span className="flex items-center gap-3 text-xs text-slate-500">
                      {index > 0 && step.conversionFromFirstPercent !== null && (
                        <span>{step.conversionFromFirstPercent}% of views</span>
                      )}
                      {step.dropOffFromPreviousPercent !== null && (
                        <span
                          className={
                            isBiggestDrop ? "font-bold text-rose-300" : undefined
                          }
                        >
                          −{step.dropOffFromPreviousPercent}% vs previous
                        </span>
                      )}
                      <span className="text-sm font-black text-white">
                        {step.count.toLocaleString()}
                      </span>
                    </span>
                  </div>
                  <div className="mt-2 h-2 rounded-full bg-slate-800">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-emerald-600 to-cyan-400"
                      style={{ width: `${barPct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div
            className={`mt-4 flex items-start gap-3 rounded-xl border px-4 py-3 ${style.boxClassName}`}
          >
            <Icon
              name={style.icon}
              className={`mt-0.5 size-4 shrink-0 ${style.tone}`}
            />
            <div className="min-w-0">
              <p className={`text-sm font-bold ${style.tone}`}>{insight.title}</p>
              <p className="mt-0.5 text-xs text-slate-400">
                {insightDescription}
              </p>
            </div>
          </div>
        </>
      )}

      {frictionItems.length > 0 && (
        <div className="mt-4 border-t border-slate-800/60 pt-3">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
            Quick-commerce friction
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {frictionItems.map((item) => (
              <span
                className="inline-flex items-center gap-2 rounded-lg border border-slate-700/70 bg-slate-950/60 px-3 py-1.5 text-xs"
                key={item.label}
              >
                <span className="text-slate-400">{item.label}</span>
                <span className="font-black text-white">
                  {item.count.toLocaleString()}
                </span>
              </span>
            ))}
          </div>
        </div>
      )}
    </GlowCard>
  );
}
