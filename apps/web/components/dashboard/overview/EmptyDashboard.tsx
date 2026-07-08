import { GlowCard } from "@/components/common/GlowCard";
import { Icon } from "@/components/common/Icon";

export function EmptyDashboard() {
  return (
    <GlowCard className="mx-auto mt-8 max-w-lg p-10 text-center">
      <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl border border-slate-700 bg-slate-800 text-cyan-400">
        <Icon className="size-7" name="spark" />
      </div>
      <h2 className="text-xl font-black text-white">Welcome to EventPulse</h2>
      <p className="mt-2 text-sm text-slate-400">
        Create a project for your store and generate an API key to start sending
        commerce events.
      </p>
      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
        <a
          className="rounded-xl bg-cyan-500 px-5 py-2.5 text-sm font-bold text-slate-950 hover:bg-cyan-400"
          href="/dashboard/projects"
        >
          Create a Project
        </a>
        <a
          className="rounded-xl border border-slate-700 px-5 py-2.5 text-sm font-bold text-slate-300 hover:border-slate-600 hover:text-white"
          href="/dashboard/api-keys"
        >
          Manage API Keys
        </a>
      </div>
    </GlowCard>
  );
}
