"use client";

import { Icon } from "@/components/common/Icon";
import { useOutsideClick } from "@/hooks/useOutsideClick";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import {
  ALL_PROJECTS_ID,
  useDashboardHeaderState,
} from "./DashboardHeaderContext";

export function HeaderProjectSelector() {
  const router = useRouter();
  const {
    projects,
    selectedProject,
    selectedProjectId,
    setSelectedProjectId,
  } = useDashboardHeaderState();
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useOutsideClick(wrapperRef, () => setIsOpen(false), isOpen);

  const label =
    selectedProjectId === ALL_PROJECTS_ID
      ? "All Projects"
      : (selectedProject?.name ?? "Select Project");

  function selectProject(id: string) {
    setSelectedProjectId(id);
    setIsOpen(false);
  }

  return (
    <div className="relative shrink-0" ref={wrapperRef}>
      <button
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        className="flex h-12 max-w-[220px] shrink-0 items-center gap-2 rounded-xl border border-slate-700/80 bg-slate-950/60 px-4 text-sm font-bold text-slate-200"
        onClick={() => setIsOpen((current) => !current)}
        type="button"
      >
        <Icon name="cube" className="size-4 shrink-0 text-cyan-400" />
        <span className="truncate">{label}</span>
        <span className="text-slate-500">⌄</span>
      </button>

      {isOpen ? (
        <div
          className="absolute left-0 top-full z-50 mt-3 w-72 overflow-hidden rounded-2xl border border-blue-500/55 bg-[#071426]/95 shadow-[0_24px_70px_rgba(0,0,0,0.42),0_0_28px_rgba(14,165,233,0.14)] backdrop-blur-xl"
          role="listbox"
        >
          <div className="max-h-[320px] overflow-y-auto px-2 py-2">
            <button
              aria-selected={selectedProjectId === ALL_PROJECTS_ID}
              className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition hover:bg-white/5 ${
                selectedProjectId === ALL_PROJECTS_ID
                  ? "text-white"
                  : "text-slate-300"
              }`}
              onClick={() => selectProject(ALL_PROJECTS_ID)}
              role="option"
              type="button"
            >
              <span className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-slate-700/70 bg-slate-950/50 text-cyan-400">
                <Icon name="stack" className="size-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-bold">
                  All Projects
                </span>
                <span className="block truncate text-xs text-slate-500">
                  Aggregate across every project
                </span>
              </span>
              {selectedProjectId === ALL_PROJECTS_ID ? (
                <Icon name="check" className="size-4 text-cyan-400" />
              ) : null}
            </button>

            {projects.length === 0 ? (
              <p className="px-3 py-3 text-xs text-slate-500">No projects yet.</p>
            ) : (
              projects.map((project) => {
                const isSelected = project.id === selectedProjectId;
                const isActive = project.status === "ACTIVE";

                return (
                  <button
                    aria-selected={isSelected}
                    className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition hover:bg-white/5 ${
                      isSelected ? "text-white" : "text-slate-300"
                    }`}
                    key={project.id}
                    onClick={() => selectProject(project.id)}
                    role="option"
                    type="button"
                  >
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-slate-700/70 bg-slate-950/50 text-cyan-400">
                      <Icon name="cube" className="size-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-bold">
                        {project.name}
                      </span>
                      <span className="block truncate text-xs text-slate-500">
                        {project.domain}
                      </span>
                    </span>
                    <span
                      className={`flex shrink-0 items-center gap-1.5 text-xs font-bold ${
                        isActive ? "text-emerald-300" : "text-rose-300"
                      }`}
                    >
                      <span
                        className={`size-2 rounded-full ${
                          isActive ? "bg-emerald-400" : "bg-rose-400"
                        }`}
                      />
                      {isActive ? "Active" : "Inactive"}
                    </span>
                    {isSelected ? (
                      <Icon name="check" className="size-4 text-cyan-400" />
                    ) : null}
                  </button>
                );
              })
            )}
          </div>

          <div className="border-t border-slate-800/80 px-2 py-2">
            <button
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-bold text-slate-300 transition hover:bg-white/5 hover:text-white"
              onClick={() => {
                setIsOpen(false);
                router.push("/dashboard/projects");
              }}
              type="button"
            >
              <span className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-slate-700/70 bg-slate-950/50 text-cyan-400">
                <Icon name="folder" className="size-4" />
              </span>
              View all projects
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
