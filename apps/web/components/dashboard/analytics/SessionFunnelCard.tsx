import { GlowCard } from "@/components/common/GlowCard";
import { Icon } from "@/components/common/Icon";
import type {
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

const ABANDONMENT_ITEMS: {
  key: keyof SessionFunnelAbandonment;
  label: string;
}[] = [
  { key: "viewedNotCarted", label: "Viewed, not carted" },
  { key: "cartedNotCheckout", label: "Carted, no checkout" },
  { key: "checkoutNotPurchased", label: "Checkout, not purchased" },
];

export function SessionFunnelCard({ funnel }: { funnel: SessionFunnel }) {
  const { steps, abandonment, insight } = funnel;
  const isEmpty = funnel.totalSessions === 0;
  const maxSessions = Math.max(...steps.map((s) => s.sessions), 1);
  const style = SEVERITY_STYLES[insight.severity];

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

  return (
    <GlowCard className="p-5">
      <div className="flex items-center gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-full border border-violet-400/25 bg-violet-500/10 text-violet-300">
          <Icon name="user" className="size-5" />
        </div>
        <div className="min-w-0">
          <h2 className="text-lg font-black text-white">Session Funnel</h2>
          <p className="text-xs text-slate-500">
            Shopper sessions moving through the purchase journey.
          </p>
        </div>
      </div>

      {isEmpty ? (
        <div className="mt-5 flex min-h-36 items-center justify-center rounded-xl border border-slate-800 bg-slate-950/25 px-6 py-6 text-center">
          <p className="text-sm text-slate-400">
            No session data yet. Send events with customerId and sessionId to
            unlock session-based funnel analytics.
          </p>
        </div>
      ) : (
        <>
          <p className="mt-3 text-xs text-slate-500">
            {funnel.totalSessions.toLocaleString()} sessions in this scope ·
            counts distinct sessions, not raw events.
          </p>

          <div className="mt-2 divide-y divide-slate-800/60">
            {steps.map((step, index) => {
              const isBiggestDrop = index === biggestDropIndex && biggestDrop > 0;
              const barPct = Math.max(
                (step.sessions / maxSessions) * 100,
                step.sessions > 0 ? 4 : 1,
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
                          −{step.dropOffFromPreviousPercent}%
                          {step.abandonedFromPrevious !== null
                            ? ` · ${step.abandonedFromPrevious.toLocaleString()} left`
                            : ""}
                        </span>
                      )}
                      <span className="text-sm font-black text-white">
                        {step.sessions.toLocaleString()}
                      </span>
                    </span>
                  </div>
                  <div className="mt-2 h-2 rounded-full bg-slate-800">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-violet-600 to-cyan-400"
                      style={{ width: `${barPct}%` }}
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
                {insight.description}
              </p>
            </div>
          </div>
        </>
      )}
    </GlowCard>
  );
}
