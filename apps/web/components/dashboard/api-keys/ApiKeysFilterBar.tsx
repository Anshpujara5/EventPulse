import { Icon } from "@/components/common/Icon";

export function ApiKeysFilterBar() {
  return (
    <section className="mt-5 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
      <div className="flex flex-col gap-3 lg:flex-row">
        <div className="flex h-12 w-full min-w-0 items-center gap-3 rounded-xl border border-slate-700/80 bg-slate-950/60 px-4 text-slate-400 lg:w-80">
          <Icon name="search" className="size-5" />
          <input
            className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-slate-500"
            placeholder="Search API keys..."
          />
        </div>
        {[
          ["Production App", "cube"],
          ["All Statuses", "list"],
        ].map(([label, icon]) => (
          <button
            className="flex h-12 min-w-[220px] items-center justify-between gap-3 rounded-xl border border-slate-700/80 bg-slate-950/60 px-4 text-sm font-bold text-slate-300"
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
        className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-linear-to-r from-blue-600 to-violet-600 px-5 text-sm font-black text-white shadow-[0_0_24px_rgba(79,70,229,0.25)]"
        type="button"
      >
        <span className="text-xl leading-none">+</span>
        Create API Key
      </button>
    </section>
  );
}
