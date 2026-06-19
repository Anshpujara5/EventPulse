import { GlowCard } from "@/components/common/GlowCard";
import { Icon } from "@/components/common/Icon";
import { ProjectCard } from "./ProjectCard";
import { projects, projectSummary } from "./projects-data";

export function ProjectsOverview() {
  return (
    <div className="mx-auto max-w-[1420px] px-4 py-5 sm:px-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight">Projects</h1>
          <p className="mt-1 text-sm text-slate-400">
            Manage apps and products that send events to EventPulse.
          </p>
        </div>
        <button
          className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-linear-to-r from-blue-600 to-violet-600 px-5 text-sm font-black text-white shadow-[0_0_24px_rgba(79,70,229,0.25)]"
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
            placeholder="Search projects..."
          />
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            className="flex h-12 items-center gap-3 rounded-xl border border-slate-700/80 bg-slate-950/60 px-4 text-sm font-bold text-slate-300"
            type="button"
          >
            Status: All
            <span className="text-slate-500">⌄</span>
          </button>
          <button
            className="flex h-12 items-center gap-3 rounded-xl border border-slate-700/80 bg-slate-950/60 px-4 text-sm font-bold text-slate-300"
            type="button"
          >
            Sort by: Last Activity
            <span className="text-slate-500">⌄</span>
          </button>
        </div>
      </section>

      <section className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {projectSummary.map((item) => (
          <GlowCard className="p-5" key={item.label}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-slate-400">{item.label}</p>
                <p className="mt-3 text-3xl font-black tracking-tight text-white">{item.value}</p>
                <p className="mt-2 text-sm font-medium text-slate-500">{item.detail}</p>
              </div>
              <div className={`flex size-12 items-center justify-center rounded-xl border ${item.boxClassName} ${item.tone}`}>
                <Icon name={item.icon} />
              </div>
            </div>
          </GlowCard>
        ))}
      </section>

      <GlowCard className="mt-4 overflow-hidden">
        <div className="hidden grid-cols-[1.4fr_1.35fr_0.8fr_0.85fr_0.9fr_0.75fr_1.5fr] px-5 py-4 text-xs font-bold uppercase tracking-wide text-slate-500 lg:grid">
          <span>Project</span>
          <span>Domain</span>
          <span>Status</span>
          <span>Events</span>
          <span>Last Event</span>
          <span>API Keys</span>
          <span className="text-right">Actions</span>
        </div>
        {projects.map((project) => (
          <ProjectCard key={project.name} project={project} />
        ))}
      </GlowCard>

      <section className="mt-4 rounded-2xl border border-dashed border-slate-700/80 bg-slate-950/35 p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex size-14 items-center justify-center rounded-full border border-blue-400/40 bg-blue-500/10 text-3xl font-light text-cyan-300">
              +
            </div>
            <div>
              <h2 className="text-xl font-black text-white">New project</h2>
              <p className="mt-1 text-sm text-slate-400">
                Create a new project to start sending events to EventPulse.
              </p>
            </div>
          </div>
          <button
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-linear-to-r from-blue-600 to-violet-600 px-5 text-sm font-black text-white shadow-[0_0_24px_rgba(79,70,229,0.25)]"
            type="button"
          >
            <span className="text-xl leading-none">+</span>
            Create new project
          </button>
        </div>
      </section>
    </div>
  );
}
