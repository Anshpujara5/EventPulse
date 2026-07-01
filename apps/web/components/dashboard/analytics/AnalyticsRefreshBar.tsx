import { Icon } from "@/components/common/Icon";

interface Props {
  loading: boolean;
  onRefresh: () => void;
}

export function AnalyticsRefreshBar({ loading, onRefresh }: Props) {
  return (
    <button
      className="mt-1 inline-flex h-10 items-center gap-2 rounded-xl border border-slate-700/80 bg-slate-950/60 px-4 text-sm font-bold text-slate-300 hover:border-slate-500 hover:text-white disabled:opacity-50"
      disabled={loading}
      onClick={onRefresh}
      type="button"
    >
      <Icon className="size-4" name="activity" />
      {loading ? "Loading…" : "Refresh"}
    </button>
  );
}
