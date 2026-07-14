import { AnalyticsOverview } from "@/components/dashboard/analytics/AnalyticsOverview";
import { Suspense } from "react";

export default function AnalyticsPage() {
  return (
    <Suspense fallback={<AnalyticsPageFallback />}>
      <AnalyticsOverview />
    </Suspense>
  );
}

function AnalyticsPageFallback() {
  return (
    <div className="mx-auto flex h-72 max-w-[1420px] items-center justify-center px-4 py-5 sm:px-6">
      <div className="flex flex-col items-center gap-3">
        <div className="size-8 animate-spin rounded-full border-2 border-slate-700 border-t-cyan-400" />
        <p className="text-sm text-slate-500">Loading analytics…</p>
      </div>
    </div>
  );
}
