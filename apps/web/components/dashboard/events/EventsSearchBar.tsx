import { Icon } from "@/components/common/Icon";

interface Props {
  value: string;
  onChange: (v: string) => void;
  onRefresh: () => void;
  loading: boolean;
}

export function EventsSearchBar({ value, onChange, onRefresh, loading }: Props) {
  return (
    <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
      <div className="flex h-12 w-full max-w-[410px] items-center gap-3 rounded-xl border border-slate-700/80 bg-slate-950/60 px-4 text-slate-400">
        <Icon className="size-5 shrink-0" name="search" />
        <input
          className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-slate-500"
          onChange={(e) => onChange(e.target.value)}
          placeholder="Filter by event name…"
          type="text"
          value={value}
        />
        {value && (
          <button
            className="text-slate-500 hover:text-white"
            onClick={() => onChange("")}
            type="button"
          >
            ✕
          </button>
        )}
      </div>

      <button
        className="inline-flex h-12 items-center gap-2 rounded-xl border border-slate-700/80 bg-slate-950/60 px-4 text-sm font-bold text-slate-300 hover:border-slate-500 hover:text-white disabled:opacity-50"
        disabled={loading}
        onClick={onRefresh}
        type="button"
      >
        <Icon className="size-4" name="activity" />
        Refresh
      </button>
    </div>
  );
}
