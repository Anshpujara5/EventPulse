import { Icon } from "@/components/common/Icon";
import { apiBadges, securityBullets } from "./landing-data";

export function DeveloperApiSection() {
  return (
    <section
      className="relative z-10 mx-auto grid max-w-300 gap-5 px-4 py-8 sm:px-6 lg:grid-cols-[0.95fr_1.1fr_0.65fr]"
      id="docs"
    >
      <div className="self-center">
        <p className="text-xs font-extrabold uppercase tracking-[0.15em] text-cyan-400">
          Developer Friendly
        </p>
        <h2 className="mt-4 text-2xl font-black text-white sm:text-3xl">
          Simple API. Built for Commerce.
        </h2>
        <p className="mt-3 text-base leading-7 text-slate-300">
          Integrate in minutes and start sending commerce events like
          product_viewed, add_to_cart, and purchase_completed.
        </p>
        <div className="mt-6 flex flex-wrap gap-3 text-xs font-bold text-slate-200">
          {apiBadges.map((badge, index) => (
            <span
              className="inline-flex items-center gap-2 rounded-md border border-white/10 bg-white/4.5 px-3 py-2"
              key={badge}
            >
              <Icon
                name={index === 0 ? "link" : index === 1 ? "document" : "lock"}
                className="size-4 text-cyan-400"
              />
              {badge}
            </span>
          ))}
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-white/15 bg-[#07101f]/95 shadow-[0_0_30px_rgba(15,23,42,0.45)]">
        <div className="flex items-center justify-between border-b border-white/10 bg-white/4 px-4 py-2.5">
          <p className="font-mono text-sm font-bold text-cyan-300">
            POST <span className="text-white">/api/events/ingest</span>
          </p>
          <span className="rounded bg-white/5 px-2 py-1 text-[10px] text-slate-300">
            curl
          </span>
        </div>
        <pre className="overflow-x-auto p-4 text-[13px] leading-6 text-slate-300">
          <code>{`curl -X POST https://api.eventpulse.dev/api/events/ingest \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "add_to_cart",
    "properties": {
      "product_id": "sku_123",
      "cart_value": 499,
      "quantity": 2,
      "category": "Grocery"
    }
  }'`}</code>
        </pre>
      </div>

      <aside className="rounded-lg border border-white/15 bg-white/4.5 p-5">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-lg bg-blue-500/15 text-cyan-400">
            <Icon name="shield" className="size-6" />
          </div>
          <h3 className="text-base font-extrabold text-white">
            Your API Key is Secure
          </h3>
        </div>
        <p className="mb-5 text-xs leading-5 text-slate-300">
          API keys are scoped per project and encrypted at rest. We never
          store your secrets in plain text.
        </p>
        <div className="space-y-3">
          {securityBullets.map((item) => (
            <p className="flex items-center gap-2 text-xs text-slate-200" key={item}>
              <span className="flex size-4 items-center justify-center rounded-full border border-emerald-400 text-emerald-300">
                <Icon name="check" className="size-3" />
              </span>
              {item}
            </p>
          ))}
        </div>
      </aside>
    </section>
  );
}
