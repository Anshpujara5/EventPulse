import { GlowCard } from "@/components/common/GlowCard";
import { Icon } from "@/components/common/Icon";

export function AnalyticsEmptyState() {
  return (
    <GlowCard className="mx-auto mt-8 max-w-xl p-10">
      <div className="flex flex-col items-center text-center">
        <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl border border-slate-700 bg-slate-800 text-violet-400">
          <Icon className="size-7" name="chart" />
        </div>
        <h2 className="text-xl font-black text-white">No commerce data yet</h2>
        <p className="mt-2 text-sm text-slate-400">
          Analytics are calculated from real commerce events. Send your first
          event to start seeing your shopper funnel here.
        </p>

        <div className="mt-6 w-full overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/80 p-4 text-left">
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">
            Send your first commerce event
          </p>
          <pre className="font-mono text-xs leading-relaxed text-cyan-100">
{`curl -X POST \\
  http://localhost:5001/api/events/ingest \\
  -H "Authorization: Bearer ep_live_xxx" \\
  -H "Content-Type: application/json" \\
  -d '{"name":"product_viewed","customerId":"customer_001","sessionId":"session_001","properties":{"product_id":"sku_123"}}'`}
          </pre>
        </div>

        <div className="mt-5 flex gap-3">
          <a
            className="rounded-xl bg-cyan-500 px-5 py-2.5 text-sm font-bold text-slate-950 hover:bg-cyan-400"
            href="/dashboard/api-keys"
          >
            Get API key
          </a>
          <a
            className="rounded-xl border border-slate-700 px-5 py-2.5 text-sm font-bold text-slate-300 hover:border-slate-600"
            href="/dashboard/events"
          >
            View events
          </a>
        </div>
      </div>
    </GlowCard>
  );
}
