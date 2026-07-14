import { GlowCard } from "@/components/common/GlowCard";
import { Icon } from "@/components/common/Icon";
import type {
  AnalyticsHealth,
  AnalyticsInsight,
  HealthStatus,
  InsightSeverity,
} from "./analytics-types";

const STATUS_STYLES: Record<
  HealthStatus,
  { tone: string; boxClassName: string; label: string; message: string }
> = {
  healthy: {
    tone: "text-emerald-300",
    boxClassName: "border-emerald-400/25 bg-emerald-500/10",
    label: "Healthy",
    message: "Tracking looks healthy in this scope.",
  },
  watch: {
    tone: "text-amber-300",
    boxClassName: "border-amber-400/25 bg-amber-500/10",
    label: "Watch",
    message: "Some patterns need attention.",
  },
  risk: {
    tone: "text-rose-300",
    boxClassName: "border-rose-400/25 bg-rose-500/10",
    label: "Risk",
    message: "Tracking may need review.",
  },
  inactive: {
    tone: "text-slate-400",
    boxClassName: "border-slate-700/50 bg-slate-800/30",
    label: "Inactive",
    message: "No event activity detected.",
  },
};

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

/**
 * Consolidated Tracking Health + Automated Commerce Insights panel
 * (blueprint A3). Tracking health stays visually primary — it is the
 * prerequisite for trusting everything below it — with the rule-based
 * insight list as the secondary, clearly separated area. Presentation
 * only: every value shown comes straight from the analytics API.
 */
export function TrackingHealthInsightsCard({
  health,
  insights,
}: {
  health: AnalyticsHealth;
  insights: AnalyticsInsight[];
}) {
  const status = STATUS_STYLES[health.status];
  const trackingNeedsAttention =
    health.status === "watch" || health.status === "risk";

  return (
    <GlowCard className="p-5">
      {/* Card header */}
      <div className="flex items-start gap-3">
        <div
          aria-hidden="true"
          className={`flex size-10 shrink-0 items-center justify-center rounded-full border ${status.boxClassName} ${status.tone}`}
        >
          <Icon name="heart" className="size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-black text-white">
            Tracking Health &amp; Commerce Insights
          </h2>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            Rule-based checks and signals computed from your real event data.
          </p>
        </div>
      </div>

      {/* Area 1 — Tracking Health (primary) */}
      <div className="mt-4">
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-black text-white">Tracking Health</h3>
            <span
              className={`rounded-full border px-2 py-0.5 text-[11px] font-black uppercase tracking-wide ${status.boxClassName} ${status.tone}`}
            >
              {status.label}
            </span>
          </div>
          <p className={`text-2xl font-black ${status.tone}`}>
            {health.score}/100
          </p>
        </div>

        <p className="mt-2 text-sm font-bold text-slate-200">{status.message}</p>

        {health.reasons.length === 0 ? (
          <p className="mt-1.5 text-xs text-slate-500">
            No major tracking issues detected.
          </p>
        ) : (
          <ul className="mt-1.5 space-y-1.5">
            {health.reasons.map((reason) => (
              <li
                className="flex gap-2 text-xs leading-5 text-slate-400"
                key={reason}
              >
                <span aria-hidden="true" className={`shrink-0 ${status.tone}`}>
                  •
                </span>
                <span className="min-w-0 break-words">{reason}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Area 2 — Automated Commerce Insights (secondary) */}
      <div className="mt-4 border-t border-slate-800/60 pt-4">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-sm font-black text-white">
            Automated Commerce Insights
          </h3>
          <span className="rounded-full border border-violet-400/25 bg-violet-500/10 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-violet-300">
            Rule-based
          </span>
        </div>

        {/* When tracking itself needs attention, say so before any business
            signal — insights must not overpower an unhealthy tracking state. */}
        {trackingNeedsAttention && (
          <p className="mt-2 text-xs leading-5 text-slate-500">
            Tracking needs attention above. Improving tracking quality
            increases confidence in these signals.
          </p>
        )}

        {insights.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500">
            No major changes detected in this scope.
          </p>
        ) : (
          <div className="mt-3 grid gap-3">
            {insights.map((insight) => {
              const style = SEVERITY_STYLES[insight.severity];
              return (
                <div
                  className="flex flex-col gap-3 rounded-xl border border-slate-800 bg-slate-950/50 px-4 py-3 sm:flex-row sm:items-start"
                  key={insight.id}
                >
                  <div
                    aria-hidden="true"
                    className={`flex size-9 shrink-0 items-center justify-center rounded-full border ${style.boxClassName} ${style.tone}`}
                  >
                    <Icon name={style.icon} className="size-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-white">
                      {insight.title}
                    </p>
                    <p className="mt-0.5 break-words text-xs leading-5 text-slate-400">
                      {insight.description}
                    </p>
                  </div>
                  {insight.metricValue !== undefined && (
                    <div className="shrink-0 sm:text-right">
                      {insight.metricLabel && (
                        <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
                          {insight.metricLabel}
                        </p>
                      )}
                      <p className={`font-black ${style.tone}`}>
                        {insight.metricValue}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </GlowCard>
  );
}
