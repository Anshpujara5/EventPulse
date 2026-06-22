import { Icon } from "@/components/common/Icon";

export function DashboardHeader() {
  return (
    <header className="sticky top-0 z-20 border-b border-slate-800/80 bg-[#020814]/85 px-4 py-4 backdrop-blur-xl sm:px-6">
      <div className="flex items-center gap-4 overflow-x-auto">
        <div className="flex min-w-0 flex-1 items-center gap-4">
          <div className="flex h-12 w-64 shrink items-center gap-3 rounded-xl border border-slate-700/80 bg-slate-950/60 px-4 text-slate-400 md:w-80 xl:w-[410px]">
            <Icon name="search" className="size-5" />
            <input
              className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-slate-500"
              placeholder="Search events, projects, alerts..."
            />
          </div>
          <button className="flex h-12 shrink-0 items-center gap-2 rounded-xl border border-slate-700/80 bg-slate-950/60 px-4 text-sm font-bold text-slate-200" type="button">
            <Icon name="cube" className="size-4 text-cyan-400" />
            Production App
            <span className="text-slate-500">⌄</span>
          </button>
          <button className="flex h-12 shrink-0 items-center gap-2 rounded-xl border border-slate-700/80 bg-slate-950/60 px-4 text-sm font-bold text-slate-200" type="button">
            <Icon name="clock" className="size-4 text-slate-400" />
            Last 24 hours
            <span className="text-slate-500">⌄</span>
          </button>
        </div>
        <div className="ml-auto flex shrink-0 items-center gap-4">
          <button className="relative flex size-12 items-center justify-center rounded-xl border border-slate-700/80 bg-slate-950/60 text-slate-200" type="button" aria-label="Alerts">
            <Icon name="bell" className="size-5" />
            <span className="absolute -right-1 -top-1 flex size-5 items-center justify-center rounded-full bg-rose-500 text-[11px] font-black text-white shadow-[0_0_14px_rgba(244,63,94,0.45)]">
              3
            </span>
          </button>
          <button className="h-12 rounded-xl bg-linear-to-r from-blue-600 to-violet-600 px-5 text-sm font-black text-white shadow-[0_0_24px_rgba(79,70,229,0.25)]" type="button">
            Create Alert
          </button>
          <button className="flex size-12 items-center justify-center rounded-full border border-cyan-400/50 bg-slate-950 text-sm font-black text-white" type="button">
            JD
          </button>
        </div>
      </div>
    </header>
  );
}
