import { Icon } from "@/components/common/Icon";
import type {
  CommerceFunnel,
  CommerceFunnelFriction,
} from "./analytics-types";

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

export function RawCommerceActivitySection({
  funnel,
}: {
  funnel: CommerceFunnel;
}) {
  const { steps, friction } = funnel;
  const isEmpty = funnel.commerceSignalEvents === 0;
  const maxEventCount = Math.max(...steps.map((step) => step.count), 1);
  const frictionItems = FRICTION_ITEMS.map(({ key, label }) => ({
    label,
    count: friction[key],
  })).filter((item) => item.count > 0);

  return (
    <section
      aria-labelledby="event-activity-title"
      className="mt-6 border-t border-slate-800/80 pt-5"
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h3
            className="text-base font-black text-slate-200"
            id="event-activity-title"
          >
            Raw commerce event activity
          </h3>
          <p className="mt-1 max-w-3xl text-xs leading-5 text-slate-500">
            Event counts show tracking activity and may include repeated
            actions from the same session. They are not unique shoppers or
            conversion rates.
          </p>
        </div>
        {!isEmpty && (
          <p className="shrink-0 text-xs font-bold text-cyan-300">
            {funnel.commerceSignalEvents.toLocaleString()} commerce signals
          </p>
        )}
      </div>

      {isEmpty ? (
        <div className="mt-4 rounded-xl border border-slate-800 bg-slate-950/25 px-5 py-5 text-center">
          <p className="text-sm text-slate-400">
            No raw commerce events in this scope yet. Send events like:
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
      ) : (
        <>
          <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
            {steps.map((step) => {
              const barPercent = Math.max(
                (step.count / maxEventCount) * 100,
                step.count > 0 ? 4 : 1,
              );

              return (
                <div
                  className="min-w-0 rounded-xl border border-slate-800 bg-slate-950/40 px-3.5 py-3"
                  key={step.id}
                >
                  <p className="break-words text-xs font-bold text-slate-400">
                    {step.label}
                  </p>
                  <p className="mt-1 text-lg font-black text-white">
                    {step.count.toLocaleString()}
                    <span className="ml-1.5 text-[11px] font-medium text-slate-500">
                      events
                    </span>
                  </p>
                  <div className="mt-2 h-1.5 rounded-full bg-slate-800">
                    <div
                      className="h-full rounded-full bg-linear-to-r from-emerald-600 to-cyan-400"
                      style={{ width: `${barPercent}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {funnel.insight.type === "missing_top_of_funnel" && (
            <div className="mt-3 flex items-start gap-3 rounded-xl border border-amber-400/25 bg-amber-500/10 px-4 py-3">
              <Icon
                className="mt-0.5 size-4 shrink-0 text-amber-300"
                name="shield"
              />
              <div className="min-w-0">
                <p className="text-sm font-bold text-amber-300">
                  {funnel.insight.title}
                </p>
                <p className="mt-0.5 text-xs leading-5 text-slate-400">
                  Add product_viewed tracking to make the raw activity sequence
                  complete. Session conversion remains unavailable without a
                  product-view session baseline.
                </p>
              </div>
            </div>
          )}
        </>
      )}

      {frictionItems.length > 0 && (
        <div className="mt-4">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
            Quick-commerce friction signals
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
    </section>
  );
}
