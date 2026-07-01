import { GlowCard } from "@/components/common/GlowCard";
import { Icon } from "@/components/common/Icon";
import type { ProjectEventCount } from "./analytics-types";

export function EventsByProjectCard({
  projects,
}: {
  projects: ProjectEventCount[];
}) {
  const maxCount = projects[0]?.count ?? 1;

  return (
    <GlowCard className="p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-black text-white">Events by Project</h2>
        <span className="text-xs text-slate-500">By volume</span>
      </div>

      {projects.length === 0 ? (
        <p className="mt-6 text-center text-sm text-slate-500">No project data yet.</p>
      ) : (
        <div className="mt-4 divide-y divide-slate-800/80">
          {projects.map((p, index) => {
            const barPct = Math.max((p.count / maxCount) * 100, 4);
            return (
              <div className="py-3" key={p.projectId}>
                <div className="grid grid-cols-[24px_1fr_auto] items-center gap-3 text-sm">
                  <span className="font-bold text-slate-500">{index + 1}</span>
                  <span className="flex min-w-0 items-center gap-3">
                    <span className="flex size-7 shrink-0 items-center justify-center rounded-lg border border-slate-700/80 bg-slate-950/60 text-cyan-400">
                      <Icon className="size-3.5" name="folder" />
                    </span>
                    <span className="truncate font-bold text-slate-200">
                      {p.projectName}
                    </span>
                  </span>
                  <span className="font-black text-white">
                    {p.count.toLocaleString()}
                  </span>
                </div>
                <div className="mt-2 ml-9 h-1 rounded-full bg-slate-800">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-violet-600 to-cyan-400"
                    style={{ width: `${barPct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      <a
        className="mt-3 block text-right text-sm font-black text-cyan-400 hover:text-cyan-300"
        href="/dashboard/projects"
      >
        Manage projects →
      </a>
    </GlowCard>
  );
}
