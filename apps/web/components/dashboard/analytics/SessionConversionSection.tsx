import { Icon } from "@/components/common/Icon";
import type {
  CommerceFunnelStepId,
  InsightSeverity,
  SessionFunnel,
  SessionFunnelAbandonment,
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

const SESSION_STEP_LABELS: Record<CommerceFunnelStepId, string> = {
  product_viewed: "Sessions viewed",
  add_to_cart: "Sessions added to cart",
  checkout_started: "Sessions started checkout",
  purchase_completed: "Sessions that purchased",
};

const ABANDONMENT_ITEMS: {
  key: keyof SessionFunnelAbandonment;
  label: string;
}[] = [
  { key: "viewedNotCarted", label: "Viewed, not carted" },
  { key: "cartedNotCheckout", label: "Carted, no checkout" },
  { key: "checkoutNotPurchased", label: "Checkout, not purchased" },
];

export function SessionConversionSection({
  funnel,
}: {
  funnel: SessionFunnel;
}) {
  const { steps, abandonment, insight } = funnel;
  const isEmpty = funnel.totalSessions === 0;
  const hasViewBaseline = (steps[0]?.sessions ?? 0) > 0;
  const maxSessions = Math.max(...steps.map((step) => step.sessions), 1);
  const style = SEVERITY_STYLES[insight.severity];

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

  return (
    <section aria-labelledby="session-conversion-title" className="mt-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h3
            className="text-base font-black text-white"
            id="session-conversion-title"
          >
            Session conversion
          </h3>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            Distinct shopper sessions are the source of truth for conversion.
          </p>
        </div>
        {!isEmpty && (
          <p className="shrink-0 text-xs font-bold text-violet-300">
            {funnel.totalSessions.toLocaleString()} sessions in this scope
          </p>
        )}
      </div>

      {isEmpty ? (
        <div className="mt-4 flex min-h-36 items-center justify-center rounded-xl border border-slate-800 bg-slate-950/25 px-6 py-6 text-center">
          <div className="max-w-xl">
            <p className="text-sm font-bold text-slate-300">
              No session conversion data yet.
            </p>
            <p className="mt-1 text-sm leading-6 text-slate-500">
              Send events with customerId and sessionId to measure how shopper
              sessions move from product interest to purchase. Raw event
              activity may still be available below.
            </p>
          </div>
        </div>
      ) : (
        <>
          <div className="mt-3 divide-y divide-slate-800/60">
            {steps.map((step, index) => {
              const isBiggestDrop =
                index === biggestDropIndex && biggestDrop > 0;
              const barPercent = Math.max(
                (step.sessions / maxSessions) * 100,
                step.sessions > 0 ? 4 : 1,
              );
              const conversionFromViews =
                index === 0
                  ? "Starting point"
                  : step.conversionFromFirstPercent === null
                    ? "Of sessions viewed —"
                    : `${step.conversionFromFirstPercent}% of sessions viewed`;
              const dropOff =
                index === 0
                  ? null
                  : step.dropOffFromPreviousPercent === null
                    ? "Drop-off —"
                    : `${step.dropOffFromPreviousPercent}% drop-off`;

              return (
                <div className="py-3" key={step.id}>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="shrink-0 text-sm font-bold text-slate-500">
                        {index + 1}.
                      </span>
                      <span className="min-w-0 break-words text-sm font-bold text-slate-200">
                        {SESSION_STEP_LABELS[step.id]}
                      </span>
                      {isBiggestDrop && (
                        <span className="shrink-0 rounded-full border border-rose-400/25 bg-rose-500/10 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-rose-300">
                          Biggest drop-off
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs sm:justify-end">
                      <span className="text-slate-500">
                        {conversionFromViews}
                      </span>
                      {dropOff && (
                        <span
                          className={
                            isBiggestDrop
                              ? "font-bold text-rose-300"
                              : "text-slate-500"
                          }
                        >
                          {dropOff}
                          {step.abandonedFromPrevious !== null
                            ? ` · ${step.abandonedFromPrevious.toLocaleString()} left`
                            : ""}
                        </span>
                      )}
                      <span className="font-black text-white">
                        {step.sessions.toLocaleString()} sessions
                      </span>
                    </div>
                  </div>

                  <div className="mt-2 h-2 rounded-full bg-slate-800">
                    <div
                      className="h-full rounded-full bg-linear-to-r from-violet-600 to-cyan-400"
                      style={{ width: `${barPercent}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-4 grid gap-2 sm:grid-cols-3">
            {ABANDONMENT_ITEMS.map((item) => (
              <div
                className="rounded-xl border border-slate-800 bg-slate-950/50 px-3 py-2.5"
                key={item.key}
              >
                <p className="text-[11px] text-slate-500">{item.label}</p>
                <p className="text-lg font-black text-white">
                  {abandonment[item.key].toLocaleString()}
                </p>
              </div>
            ))}
          </div>

          {hasViewBaseline ? (
            <div
              className={`mt-4 flex items-start gap-3 rounded-xl border px-4 py-3 ${style.boxClassName}`}
            >
              <Icon
                className={`mt-0.5 size-4 shrink-0 ${style.tone}`}
                name={style.icon}
              />
              <div className="min-w-0">
                <p className={`text-sm font-bold ${style.tone}`}>
                  {insight.title}
                </p>
                <p className="mt-0.5 text-xs leading-5 text-slate-400">
                  {insight.description}
                </p>
              </div>
            </div>
          ) : (
            <div className="mt-4 flex items-start gap-3 rounded-xl border border-amber-400/25 bg-amber-500/10 px-4 py-3">
              <Icon
                className="mt-0.5 size-4 shrink-0 text-amber-300"
                name="shield"
              />
              <div className="min-w-0">
                <p className="text-sm font-bold text-amber-300">
                  Session conversion baseline unavailable
                </p>
                <p className="mt-0.5 text-xs leading-5 text-slate-400">
                  No session reached the product-view stage, so conversion and
                  drop-off percentages that depend on that stage are shown as
                  unavailable.
                </p>
              </div>
            </div>
          )}
        </>
      )}
    </section>
  );
}
