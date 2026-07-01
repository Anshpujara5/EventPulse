import { GlowCard } from "@/components/common/GlowCard";
import { Icon } from "@/components/common/Icon";

export function NotificationPreferencesCard() {
  return (
    <GlowCard className="flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-2.5 border-b border-slate-800/60 px-5 py-4">
        <div className="flex size-7 items-center justify-center rounded-lg bg-amber-500/10 text-amber-400 ring-1 ring-amber-400/20">
          <Icon className="size-3.5" name="bell" />
        </div>
        <span className="text-sm font-bold text-white">Notifications</span>
      </div>

      {/* Honest empty state */}
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-8 text-center">
        <div className="mb-3 flex size-10 items-center justify-center rounded-xl border border-slate-800/60 bg-slate-900/60 text-slate-600">
          <Icon className="size-5" name="bell" />
        </div>
        <p className="text-sm font-medium text-slate-400">Not connected</p>
        <p className="mt-1.5 max-w-[200px] text-[11px] leading-relaxed text-slate-600">
          Notification preferences will appear here when the feature is configured.
        </p>
      </div>

      {/* CTA — disabled */}
      <div className="border-t border-slate-800/60 px-5 py-4">
        <button
          className="h-8 w-full cursor-not-allowed rounded-lg border border-slate-700/70 bg-slate-900/60 text-xs font-semibold text-slate-500"
          disabled
          title="Coming soon"
          type="button"
        >
          Notifications — coming soon
        </button>
      </div>
    </GlowCard>
  );
}
