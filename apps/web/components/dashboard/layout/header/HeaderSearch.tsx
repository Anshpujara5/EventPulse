import { Icon } from "@/components/common/Icon";

export function HeaderSearch() {
  return (
    <div className="flex h-12 w-64 shrink items-center gap-3 rounded-xl border border-slate-700/80 bg-slate-950/60 px-4 text-slate-400 md:w-80 xl:w-[410px]">
      <Icon name="search" className="size-5" />
      <input
        className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-slate-500"
        placeholder="Search events, projects, alerts..."
      />
    </div>
  );
}
