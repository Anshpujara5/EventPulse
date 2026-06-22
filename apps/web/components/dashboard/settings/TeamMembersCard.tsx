import { GlowCard } from "@/components/common/GlowCard";
import { Icon } from "@/components/common/Icon";
import { teamMembers } from "./settings-data";

export function TeamMembersCard() {
  return (
    <GlowCard className="p-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-blue-500/10 text-cyan-300">
            <Icon name="network" />
          </div>
          <h2 className="text-lg font-black text-white">Team Members</h2>
        </div>
        <button className="flex h-10 items-center gap-2 rounded-lg border border-slate-700/80 bg-slate-950/50 px-3 text-sm font-bold text-slate-300" type="button">
          <Icon name="user" className="size-4" />
          Invite Member
        </button>
      </div>

      <div className="mt-5 grid grid-cols-[1.4fr_0.8fr_0.65fr_24px] px-1 pb-3 text-xs font-bold uppercase tracking-wide text-slate-500">
        <span>Member</span>
        <span>Role</span>
        <span>Status</span>
        <span />
      </div>
      <div>
        {teamMembers.map((member) => (
          <div className="grid grid-cols-[1.4fr_0.8fr_0.65fr_24px] items-center border-t border-slate-800/80 py-3" key={member.name}>
            <div className="flex min-w-0 items-center gap-3">
              <div className="relative flex size-9 shrink-0 items-center justify-center rounded-full border border-blue-400/50 bg-slate-950 text-xs font-black text-white">
                {member.initials}
                <span className={`absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full ${member.status === "Invited" ? "bg-amber-400" : "bg-emerald-400"}`} />
              </div>
              <span className="truncate text-sm font-bold text-white">{member.name}</span>
            </div>
            <span className="text-sm text-slate-300">{member.role}</span>
            <span className={`w-fit rounded-md px-2 py-1 text-xs font-black ${member.tone}`}>
              {member.status}
            </span>
            <button className="text-lg leading-none text-slate-500" type="button" aria-label={`${member.name} actions`}>
              ⋮
            </button>
          </div>
        ))}
      </div>
    </GlowCard>
  );
}
