import { GlowCard } from "@/components/common/GlowCard";
import { Icon } from "@/components/common/Icon";
import type { DashboardProject } from "./dashboard-types";

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export function RecentProjectsCard({
  projects,
}: {
  projects: DashboardProject[];
}) {
  return (
    <GlowCard className="overflow-hidden">
      <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
        <h2 className="text-lg font-black">Recent Projects</h2>
        <a
          className="text-sm font-bold text-cyan-300 hover:text-cyan-200"
          href="/dashboard/projects"
        >
          View all →
        </a>
      </div>

      {projects.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 px-5 py-10 text-center">
          <Icon className="size-8 text-slate-600" name="folder" />
          <p className="text-sm text-slate-500">No projects yet.</p>
          <a
            className="mt-1 text-sm font-bold text-cyan-400 hover:text-cyan-300"
            href="/dashboard/projects"
          >
            Create your first project →
          </a>
        </div>
      ) : (
        <div className="divide-y divide-slate-800">
          {projects.map((project) => (
            <div
              className="flex items-center justify-between px-5 py-4"
              key={project.id}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-slate-700 bg-slate-800 text-cyan-400">
                  <Icon className="size-4" name="folder" />
                </div>
                <div className="min-w-0">
                  <p className="truncate font-bold text-white">{project.name}</p>
                  <p className="truncate text-xs text-slate-500">{project.domain}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0 ml-3">
                <span
                  className={`rounded-md px-2 py-1 text-xs font-black ${
                    project.status === "ACTIVE"
                      ? "bg-emerald-500/10 text-emerald-300"
                      : "bg-slate-700/50 text-slate-400"
                  }`}
                >
                  {project.status === "ACTIVE" ? "Active" : "Inactive"}
                </span>
                <span className="text-xs text-slate-500 whitespace-nowrap">
                  {timeAgo(project.createdAt)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </GlowCard>
  );
}
