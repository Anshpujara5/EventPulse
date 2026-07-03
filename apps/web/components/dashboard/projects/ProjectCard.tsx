import { Icon } from "@/components/common/Icon";

export type Project = {
  id: string;
  name: string;
  domain: string;
  description: string | null;
  status: "ACTIVE" | "INACTIVE";
  createdAt: string;
  updatedAt: string;
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

export function ProjectCard({
  project,
  isSelected = false,
}: {
  project: Project;
  isSelected?: boolean;
}) {
  const isActive = project.status === "ACTIVE";
  const statusLabel = isActive ? "Active" : "Inactive";

  return (
    <div
      className={`grid gap-4 border-t border-slate-800/80 px-5 py-4 text-sm first:border-t-0 lg:grid-cols-[minmax(220px,2fr)_minmax(0,1.05fr)_112px_minmax(0,0.95fr)_120px_120px_164px] lg:items-center ${
        isSelected ? "bg-blue-500/8 ring-1 ring-inset ring-blue-400/45" : ""
      }`}
    >
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-full border border-cyan-400/35 bg-cyan-500/10 text-cyan-400">
          <Icon name="cube" className="size-5" />
        </div>
        <div className="min-w-0">
          <p className="truncate font-black text-white" title={project.name}>{project.name}</p>
          <p className="mt-1 truncate text-xs text-slate-500 lg:hidden" title={project.domain}>{project.domain}</p>
        </div>
      </div>

      <p className="hidden truncate text-slate-400 lg:block" title={project.domain}>{project.domain}</p>

      <div>
        <span
          className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-black ${
            isActive
              ? "border-emerald-400/20 bg-emerald-500/10 text-emerald-300"
              : "border-rose-400/20 bg-rose-500/10 text-rose-300"
          }`}
        >
          <span className={`size-2 rounded-full ${isActive ? "bg-emerald-400" : "bg-rose-400"}`} />
          {statusLabel}
        </span>
      </div>

      <p className="min-w-0 truncate text-slate-400" title={project.description || "No description"}>
        <span className="text-slate-500 lg:hidden">Description: </span>
        {project.description || "No description"}
      </p>

      <p className="flex min-w-0 items-center gap-2 text-slate-400">
        <span className={`size-2 rounded-full ${isActive ? "bg-emerald-400" : "bg-slate-500"}`} />
        <span className="truncate">{formatDate(project.createdAt)}</span>
      </p>

      <p className="min-w-0 truncate text-slate-400">
        <span className="text-slate-500 lg:hidden">Updated: </span>
        {formatDate(project.updatedAt)}
      </p>

      <div className="flex items-center gap-2 lg:justify-end">
        {["View", "Settings"].map((action) => (
          <button
            className="w-19 cursor-not-allowed rounded-lg border border-slate-700/70 bg-slate-950/35 px-3 py-2 text-xs font-bold text-slate-600"
            disabled
            key={action}
            title="Coming soon"
            type="button"
          >
            {action}
          </button>
        ))}
      </div>
    </div>
  );
}
