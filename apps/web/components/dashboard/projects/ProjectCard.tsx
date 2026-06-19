import { Icon } from "@/components/common/Icon";
import type { projects } from "./projects-data";

export function ProjectCard({ project }: { project: (typeof projects)[number] }) {
  const isActive = project.status === "Active";

  return (
    <div className="grid gap-4 border-t border-slate-800/80 px-5 py-4 text-sm first:border-t-0 lg:grid-cols-[1.4fr_1.35fr_0.8fr_0.85fr_0.9fr_0.75fr_1.5fr] lg:items-center">
      <div className="flex min-w-0 items-center gap-3">
        <div className={`flex size-9 shrink-0 items-center justify-center rounded-full border ${project.iconClassName} ${project.iconTone}`}>
          <Icon name="cube" className="size-5" />
        </div>
        <div className="min-w-0">
          <p className="truncate font-black text-white">{project.name}</p>
          <p className="mt-1 truncate text-xs text-slate-500 lg:hidden">{project.domain}</p>
        </div>
      </div>

      <p className="hidden truncate text-slate-400 lg:block">{project.domain}</p>

      <div>
        <span
          className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-black ${
            isActive
              ? "border-emerald-400/20 bg-emerald-500/10 text-emerald-300"
              : "border-rose-400/20 bg-rose-500/10 text-rose-300"
          }`}
        >
          <span className={`size-2 rounded-full ${isActive ? "bg-emerald-400" : "bg-rose-400"}`} />
          {project.status}
        </span>
      </div>

      <p className="font-bold text-white">
        <span className="text-slate-500 lg:hidden">Events: </span>
        {project.events}
      </p>

      <p className="flex items-center gap-2 text-slate-400">
        <span className={`size-2 rounded-full ${isActive ? "bg-emerald-400" : "bg-slate-500"}`} />
        {project.lastEvent}
      </p>

      <p className="font-bold text-white">
        <span className="text-slate-500 lg:hidden">API keys: </span>
        {project.apiKeys}
      </p>

      <div className="flex flex-wrap items-center gap-2 lg:justify-end">
        {["View", "API Keys", "Settings"].map((action) => (
          <button
            className="rounded-lg border border-slate-700/80 bg-slate-950/35 px-4 py-2 text-xs font-bold text-slate-300 transition hover:border-cyan-300/35 hover:text-cyan-300"
            key={action}
            type="button"
          >
            {action}
          </button>
        ))}
      </div>
    </div>
  );
}
