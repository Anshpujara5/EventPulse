import { GlowCard } from "@/components/common/GlowCard";
import { Icon } from "@/components/common/Icon";

export function TeamMembersCard() {
  return (
    <GlowCard className="overflow-hidden">
      {/* Card header */}
      <div className="flex items-center justify-between border-b border-slate-800/60 px-5 py-4">
        <div className="flex items-center gap-2.5">
          <div className="flex size-7 items-center justify-center rounded-lg bg-violet-500/10 text-violet-400 ring-1 ring-violet-400/20">
            <Icon className="size-3.5" name="network" />
          </div>
          <span className="text-sm font-bold text-white">Team Members</span>
        </div>
        <button
          className="inline-flex h-8 cursor-not-allowed items-center gap-1.5 rounded-lg border border-slate-700/70 bg-slate-900/60 px-3 text-xs font-semibold text-slate-600"
          disabled
          title="Coming soon"
          type="button"
        >
          <Icon className="size-3.5" name="user" />
          Invite — coming soon
        </button>
      </div>

      {/* Honest empty state */}
      <div className="flex flex-col items-center justify-center px-6 py-10 text-center">
        <div className="mb-3 flex size-10 items-center justify-center rounded-xl border border-slate-800/60 bg-slate-900/60 text-slate-600">
          <Icon className="size-5" name="network" />
        </div>
        <p className="text-sm font-medium text-slate-400">
          Team management is not connected yet
        </p>
        <p className="mt-1.5 max-w-sm text-[11px] leading-relaxed text-slate-600">
          Multi-user support is coming soon. You&apos;ll be able to invite and manage team members here once the feature is available.
        </p>
      </div>
    </GlowCard>
  );
}
