import { Icon } from "@/components/common/Icon";

export function AnalyticsFilterBar() {
  return (
    <section className="mt-4 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
      <div className="flex flex-wrap gap-3">
        {[
          ["Last 24 Hours", "clock"],
          ["Production App", "cube"],
          ["All Events", "list"],
        ].map(([label, icon]) => (
          <button
            className="flex h-11 min-w-[210px] items-center justify-between gap-3 rounded-xl border border-slate-700/80 bg-slate-950/60 px-4 text-sm font-bold text-slate-300"
            key={label}
            type="button"
          >
            <span className="flex items-center gap-3">
              <Icon name={icon} className="size-4 text-cyan-400" />
              {label}
            </span>
            <span className="text-slate-500">⌄</span>
          </button>
        ))}
      </div>
      <button
        className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-700/80 bg-slate-950/60 px-5 text-sm font-black text-slate-200 transition hover:border-cyan-300/35 hover:text-cyan-300"
        type="button"
      >
        <Icon name="document" className="size-4" />
        Export Report
      </button>
    </section>
  );
}
