import { GlowCard } from "@/components/common/GlowCard";
import { Icon } from "@/components/common/Icon";

export function EventsEmptyState() {
  return (
    <GlowCard className="mx-auto mt-8 max-w-xl p-10">
      <div className="flex flex-col items-center text-center">
        <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl border border-slate-700 bg-slate-800 text-cyan-400">
          <Icon className="size-7" name="pulse" />
        </div>
        <h2 className="text-xl font-black text-white">No commerce events yet</h2>
        <p className="mt-2 text-sm text-slate-400">
          Track shopper actions as they move through your store. Send events like
          product_viewed, add_to_cart, checkout_started, or purchase_completed
          and they will appear here in real time.
        </p>

        <div className="mt-6 w-full overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/80 p-4 text-left">
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">
            Quick start
          </p>
          <pre className="font-mono text-xs leading-relaxed text-cyan-100">
{`curl -X POST \\
  https://your-api/api/events/ingest \\
  -H "Authorization: Bearer ep_live_xxx" \\
  -H "Content-Type: application/json" \\
  -d '{"name":"add_to_cart","properties":{"product_id":"sku_123","cart_value":499}}'`}
          </pre>
        </div>

        <a
          className="mt-6 inline-block rounded-xl bg-cyan-500 px-5 py-2.5 text-sm font-bold text-slate-950 hover:bg-cyan-400"
          href="/dashboard/api-keys"
        >
          Get your API key →
        </a>
      </div>
    </GlowCard>
  );
}
