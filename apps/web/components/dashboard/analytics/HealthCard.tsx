import { GlowCard } from "@/components/common/GlowCard";
import { Icon } from "@/components/common/Icon";
import type { AnalyticsHealth, HealthStatus } from "./analytics-types";

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

export function HealthCard({ health }: { health: AnalyticsHealth }) {
  const style = STATUS_STYLES[health.status];

  return (
    <GlowCard className="p-5">
      <div className="flex items-center gap-3">
        <div
          className={`flex size-10 shrink-0 items-center justify-center rounded-full border ${style.boxClassName} ${style.tone}`}
        >
          <Icon name="heart" className="size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-black text-white">Event Health</h2>
            <span
              className={`rounded-full border px-2 py-0.5 text-[11px] font-black uppercase tracking-wide ${style.boxClassName} ${style.tone}`}
            >
              {style.label}
            </span>
          </div>
          <p className="text-xs text-slate-500">Rule-based score from current analytics.</p>
        </div>
        <p className={`shrink-0 text-2xl font-black ${style.tone}`}>{health.score}/100</p>
      </div>

      <p className="mt-4 text-sm font-bold text-slate-200">{style.message}</p>

      {health.reasons.length === 0 ? (
        <p className="mt-2 text-xs text-slate-500">No major tracking issues detected.</p>
      ) : (
        <ul className="mt-2 space-y-1.5">
          {health.reasons.map((reason) => (
            <li className="flex gap-2 text-xs text-slate-400" key={reason}>
              <span className={style.tone}>•</span>
              {reason}
            </li>
          ))}
        </ul>
      )}
    </GlowCard>
  );
}
