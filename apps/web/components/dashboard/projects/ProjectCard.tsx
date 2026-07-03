"use client";

import { Icon } from "@/components/common/Icon";
import Link from "next/link";
import { useRouter } from "next/navigation";

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
  const router = useRouter();
  const isActive = project.status === "ACTIVE";
  const statusLabel = isActive ? "Active" : "Inactive";
  const viewHref = `/dashboard/projects/${project.id}`;

  return (
    <div
      className={`flex cursor-pointer flex-wrap items-center gap-x-6 gap-y-3 border-t border-slate-800/80 px-5 py-4 text-sm outline-none transition first:border-t-0 hover:bg-white/[0.025] focus-visible:bg-white/[0.025] ${
        isSelected ? "bg-blue-500/8 ring-1 ring-inset ring-blue-400/45" : ""
      }`}
      onClick={() => router.push(viewHref)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          router.push(viewHref);
        }
      }}
      role="button"
      tabIndex={0}
    >
      {/* Left: icon, name, domain, description — grows to use free space but
          wraps its neighbors to a new line rather than forcing a fixed
          multi-column table at any particular viewport width. */}
      <div className="flex min-w-0 flex-1 basis-[240px] items-center gap-3">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-full border border-cyan-400/35 bg-cyan-500/10 text-cyan-400">
          <Icon name="cube" className="size-5" />
        </div>
        <div className="min-w-0">
          <p className="truncate font-black text-white" title={project.name}>
            {project.name}
          </p>
          <p className="mt-0.5 truncate text-xs text-slate-500" title={project.domain}>
            {project.domain}
          </p>
          <p
            className="mt-0.5 truncate text-xs text-slate-500"
            title={project.description || "No description"}
          >
            {project.description || "No description"}
          </p>
        </div>
      </div>

      {/* Middle: status + created/updated */}
      <div className="flex shrink-0 flex-wrap items-center gap-4">
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
        <div className="text-xs text-slate-500">
          <p>
            Created <span className="font-bold text-slate-300">{formatDate(project.createdAt)}</span>
          </p>
          <p className="mt-0.5">
            Updated <span className="font-bold text-slate-300">{formatDate(project.updatedAt)}</span>
          </p>
        </div>
      </div>

      {/* Far right: actions */}
      <div className="flex shrink-0 items-center gap-2">
        <Link
          className="inline-flex w-19 items-center justify-center rounded-lg border border-slate-700/80 bg-slate-950/35 px-3 py-2 text-xs font-bold text-slate-300 transition hover:border-cyan-300/35 hover:text-cyan-300"
          href={`/dashboard/projects/${project.id}/settings`}
          onClick={(event) => event.stopPropagation()}
        >
          Settings
        </Link>
      </div>
    </div>
  );
}
