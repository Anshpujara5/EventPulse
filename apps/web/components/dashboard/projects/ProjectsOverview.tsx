"use client";

import { FilterDropdown } from "@/components/common/FilterDropdown";
import { GlowCard } from "@/components/common/GlowCard";
import { Icon } from "@/components/common/Icon";
import { useDashboardHeaderState } from "@/components/dashboard/layout/header/DashboardHeaderContext";
import { apiRequest, getAuthHeaders } from "@/lib/api";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { ProjectCard, type Project } from "./ProjectCard";

type StatusFilter = "ALL" | "ACTIVE" | "INACTIVE";
type SortOption =
  | "updated"
  | "created"
  | "name-asc"
  | "name-desc"
  | "status";

const STATUS_OPTIONS = [
  { value: "ALL", label: "All" },
  { value: "ACTIVE", label: "Active" },
  { value: "INACTIVE", label: "Inactive" },
];

const SORT_OPTIONS = [
  { value: "updated", label: "Last Activity" },
  { value: "created", label: "Created Date" },
  { value: "name-asc", label: "Name A–Z" },
  { value: "name-desc", label: "Name Z–A" },
  { value: "status", label: "Status" },
];

type ProjectsResponse = {
  success: boolean;
  data: {
    projects: Project[];
  };
};

type CreateProjectResponse = {
  success: boolean;
  message: string;
  data: {
    project: Project;
  };
};

type CreateProjectForm = {
  description: string;
  domain: string;
  name: string;
};

const initialForm: CreateProjectForm = {
  description: "",
  domain: "",
  name: "",
};

function formatDate(value?: string) {
  if (!value) {
    return "No projects yet";
  }

  return new Intl.DateTimeFormat("en", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

export function ProjectsOverview() {
  // Search is driven by the shared header search box; status/sort stay local.
  const { searchQuery, setSearchQuery, selectedProjectId } =
    useDashboardHeaderState();
  const [createError, setCreateError] = useState("");
  const [error, setError] = useState("");
  const [form, setForm] = useState<CreateProjectForm>(initialForm);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [projects, setProjects] = useState<Project[]>([]);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [sortBy, setSortBy] = useState<SortOption>("updated");

  function fetchProjects() {
    const token = localStorage.getItem("eventpulse_token");

    if (!token) {
      return Promise.resolve().then(() => {
        setError("You need to sign in to view projects.");
        setIsLoading(false);
      });
    }

    return apiRequest<ProjectsResponse>("/api/projects", {
      method: "GET",
      headers: getAuthHeaders(),
    })
      .then((response) => {
        setProjects(response.data.projects);
      })
      .catch((requestError: unknown) => {
        setError(
          requestError instanceof Error
            ? requestError.message
            : "Unable to load projects",
        );
      })
      .finally(() => {
        setIsLoading(false);
      });
  }

  useEffect(() => {
    void fetchProjects();
  }, []);

  function retryProjects() {
    setError("");
    setIsLoading(true);
    void fetchProjects();
  }

  const filteredProjects = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    const matched = projects.filter((project) => {
      const matchesSearch =
        !query ||
        [project.name, project.domain, project.description ?? ""].some((value) =>
          value.toLowerCase().includes(query),
        );
      const matchesStatus =
        statusFilter === "ALL" || project.status === statusFilter;

      return matchesSearch && matchesStatus;
    });

    const sorted = [...matched];

    sorted.sort((a, b) => {
      switch (sortBy) {
        case "name-asc":
          return a.name.localeCompare(b.name);
        case "name-desc":
          return b.name.localeCompare(a.name);
        case "status":
          return a.status.localeCompare(b.status);
        case "created":
          return (
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
        case "updated":
        default:
          return (
            new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
          );
      }
    });

    return sorted;
  }, [projects, searchQuery, statusFilter, sortBy]);

  const activeProjects = projects.filter((project) => project.status === "ACTIVE").length;
  const inactiveProjects = projects.filter((project) => project.status === "INACTIVE").length;
  const latestProject = projects[0];

  const projectSummary = [
    {
      label: "Total Projects",
      value: String(projects.length),
      detail: "Stored in PostgreSQL",
      icon: "cube",
      tone: "text-cyan-400",
      boxClassName: "border-blue-400/25 bg-blue-500/10",
    },
    {
      label: "Active Projects",
      value: String(activeProjects),
      detail: `${projects.length === 0 ? 0 : Math.round((activeProjects / projects.length) * 100)}% of total`,
      icon: "pulse",
      tone: "text-emerald-400",
      boxClassName: "border-emerald-400/20 bg-emerald-500/10",
    },
    {
      label: "Inactive Projects",
      value: String(inactiveProjects),
      detail: "Disabled projects",
      icon: "clock",
      tone: "text-slate-300",
      boxClassName: "border-slate-500/25 bg-slate-700/20",
    },
    {
      label: "Latest Project",
      value: latestProject?.name ?? "None",
      detail: formatDate(latestProject?.createdAt),
      icon: "folder",
      tone: "text-violet-400",
      boxClassName: "border-violet-400/25 bg-violet-500/10",
    },
  ];

  function openCreateForm() {
    setCreateError("");
    setForm(initialForm);
    setIsCreateOpen(true);
  }

  async function handleCreateProject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const token = localStorage.getItem("eventpulse_token");

    if (!token) {
      setCreateError("You need to sign in to create projects.");
      return;
    }

    if (!form.name.trim() || !form.domain.trim()) {
      setCreateError("Project name and domain are required.");
      return;
    }

    try {
      setCreateError("");
      setIsCreating(true);

      const response = await apiRequest<CreateProjectResponse>("/api/projects", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          description: form.description.trim() || undefined,
          domain: form.domain.trim(),
          name: form.name.trim(),
        }),
      });

      setProjects((currentProjects) => [response.data.project, ...currentProjects]);
      setForm(initialForm);
      setIsCreateOpen(false);
    } catch (requestError) {
      setCreateError(requestError instanceof Error ? requestError.message : "Unable to create project");
    } finally {
      setIsCreating(false);
    }
  }

  return (
    <div className="mx-auto min-w-0 max-w-[1420px] px-4 py-5 sm:px-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight">Projects</h1>
          <p className="mt-1 text-sm text-slate-400">
            Manage the stores that send commerce events to EventPulse.
          </p>
        </div>
        <button
          className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-linear-to-r from-blue-600 to-violet-600 px-5 text-sm font-black text-white shadow-[0_0_24px_rgba(79,70,229,0.25)]"
          onClick={openCreateForm}
          type="button"
        >
          <span className="text-xl leading-none">+</span>
          Create Project
        </button>
      </div>

      <section className="mt-5 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex h-12 w-full max-w-[410px] items-center gap-3 rounded-xl border border-slate-700/80 bg-slate-950/60 px-4 text-slate-400">
          <Icon name="search" className="size-5" />
          <input
            className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-slate-500"
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search projects..."
            value={searchQuery}
          />
        </div>
        <div className="flex flex-wrap gap-3">
          <FilterDropdown
            ariaLabel="Filter projects by status"
            icon="pulse"
            onChange={(value) => setStatusFilter(value as StatusFilter)}
            options={STATUS_OPTIONS}
            prefix="Status: "
            value={statusFilter}
            widthClassName="min-w-[180px]"
          />
          <FilterDropdown
            ariaLabel="Sort projects"
            icon="list"
            onChange={(value) => setSortBy(value as SortOption)}
            options={SORT_OPTIONS}
            prefix="Sort by: "
            value={sortBy}
            widthClassName="min-w-[210px]"
          />
        </div>
      </section>

      <section className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {projectSummary.map((item) => (
          <GlowCard className="min-w-0 p-5" key={item.label}>
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-400">{item.label}</p>
                <p className="mt-3 truncate text-3xl font-black tracking-tight text-white">{item.value}</p>
                <p className="mt-2 text-sm font-medium text-slate-500">{item.detail}</p>
              </div>
              <div className={`flex size-12 shrink-0 items-center justify-center rounded-xl border ${item.boxClassName} ${item.tone}`}>
                <Icon name={item.icon} />
              </div>
            </div>
          </GlowCard>
        ))}
      </section>

      <GlowCard className="mt-4 max-w-full overflow-hidden">
        {isLoading ? (
          <div className="px-5 py-10 text-center text-sm font-bold text-slate-400">
            Loading projects...
          </div>
        ) : error ? (
          <div className="px-5 py-10 text-center">
            <p className="text-sm font-bold text-rose-300">{error}</p>
            <button
              className="mt-4 rounded-xl border border-slate-700/80 bg-slate-950/35 px-4 py-2 text-sm font-bold text-slate-300 transition hover:border-cyan-300/35 hover:text-cyan-300"
              onClick={retryProjects}
              type="button"
            >
              Try again
            </button>
          </div>
        ) : filteredProjects.length === 0 ? (
          <div className="px-5 py-10 text-center">
            <p className="text-lg font-black text-white">
              {projects.length === 0 ? "No projects yet" : "No projects found"}
            </p>
            <p className="mt-1 text-sm text-slate-400">
              {projects.length === 0
                ? "Create your first project to start sending commerce events to EventPulse."
                : "Try a different search term."}
            </p>
            {projects.length === 0 ? (
              <button
                className="mx-auto mt-5 inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-linear-to-r from-blue-600 to-violet-600 px-5 text-sm font-black text-white shadow-[0_0_24px_rgba(79,70,229,0.25)]"
                onClick={openCreateForm}
                type="button"
              >
                <span className="text-xl leading-none">+</span>
                Create Project
              </button>
            ) : null}
          </div>
        ) : (
          // ProjectCard uses a flex-wrap row internally, so it reflows to
          // narrower widths on its own — no fixed table columns or internal
          // horizontal scroll needed here.
          filteredProjects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              isSelected={project.id === selectedProjectId}
            />
          ))
        )}
      </GlowCard>

      {isCreateOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 px-4 backdrop-blur-sm">
          <form
            className="w-full max-w-lg rounded-2xl border border-slate-700/80 bg-[#071426]/95 p-6 shadow-[0_24px_70px_rgba(0,0,0,0.42),0_0_28px_rgba(14,165,233,0.14)]"
            onSubmit={handleCreateProject}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-black text-white">Create Project</h2>
                <p className="mt-1 text-sm text-slate-400">
                  Add a store that will send commerce events to EventPulse.
                </p>
              </div>
              <button
                className="flex size-9 items-center justify-center rounded-lg border border-slate-700/80 bg-slate-950/50 text-slate-400 hover:text-white"
                onClick={() => setIsCreateOpen(false)}
                type="button"
                aria-label="Close create project form"
              >
                ×
              </button>
            </div>

            <label className="mt-5 block text-sm font-bold text-slate-300">
              Project name
              <input
                className="mt-2 h-12 w-full rounded-xl border border-slate-700/80 bg-slate-950/60 px-4 text-sm text-white outline-none placeholder:text-slate-500 focus:border-cyan-400/70"
                onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                placeholder="Production App"
                value={form.name}
              />
            </label>

            <label className="mt-4 block text-sm font-bold text-slate-300">
              Domain
              <input
                className="mt-2 h-12 w-full rounded-xl border border-slate-700/80 bg-slate-950/60 px-4 text-sm text-white outline-none placeholder:text-slate-500 focus:border-cyan-400/70"
                onChange={(event) => setForm((current) => ({ ...current, domain: event.target.value }))}
                placeholder="app.example.com"
                value={form.domain}
              />
            </label>

            <label className="mt-4 block text-sm font-bold text-slate-300">
              Description
              <textarea
                className="mt-2 min-h-28 w-full resize-none rounded-xl border border-slate-700/80 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-cyan-400/70"
                onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                placeholder="Tracks product events for the main application."
                value={form.description}
              />
            </label>

            {createError ? (
              <p className="mt-4 rounded-xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm font-bold text-rose-300">
                {createError}
              </p>
            ) : null}

            <div className="mt-6 flex justify-end gap-3">
              <button
                className="h-11 rounded-xl border border-slate-700/80 bg-slate-950/50 px-5 text-sm font-bold text-slate-300"
                onClick={() => setIsCreateOpen(false)}
                type="button"
              >
                Cancel
              </button>
              <button
                className="h-11 rounded-xl bg-linear-to-r from-blue-600 to-violet-600 px-5 text-sm font-black text-white shadow-[0_0_24px_rgba(79,70,229,0.25)] disabled:opacity-60"
                disabled={isCreating}
                type="submit"
              >
                {isCreating ? "Creating..." : "Create Project"}
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}
