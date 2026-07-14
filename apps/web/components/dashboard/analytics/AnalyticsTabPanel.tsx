import type { ReactNode } from "react";
import type { AnalyticsTabLoadState } from "@/hooks/useAnalyticsTabData";

interface AnalyticsTabPanelProps<T> {
  children: (data: T) => ReactNode;
  label: string;
  onRetry: () => void;
  state: AnalyticsTabLoadState<T>;
}

export function AnalyticsTabPanel<T>({
  children,
  label,
  onRetry,
  state,
}: AnalyticsTabPanelProps<T>) {
  if (state.status === "loading") {
    return (
      <div
        aria-busy="true"
        className="mt-5 flex min-h-64 items-center justify-center"
      >
        <div className="flex flex-col items-center gap-3">
          <div className="size-8 animate-spin rounded-full border-2 border-slate-700 border-t-cyan-400" />
          <p className="text-sm text-slate-500">Loading {label}…</p>
        </div>
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <div className="mt-5 flex min-h-64 flex-col items-center justify-center gap-4">
        <p className="text-center text-rose-400" role="alert">
          {state.message}
        </p>
        <button
          className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-bold text-white hover:bg-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/70"
          onClick={onRetry}
          type="button"
        >
          Retry
        </button>
      </div>
    );
  }

  return children(state.data);
}
