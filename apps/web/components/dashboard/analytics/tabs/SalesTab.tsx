import { GlowCard } from "@/components/common/GlowCard";
import { Icon } from "@/components/common/Icon";

const REQUIRED_FIELDS = ["order_id", "amount", "currency"] as const;

export function SalesTab() {
  return (
    <GlowCard className="mt-5">
      <div className="flex min-h-72 flex-col items-center justify-center px-6 py-12 text-center">
        <div className="flex size-12 items-center justify-center rounded-full border border-violet-400/25 bg-violet-500/10 text-violet-300">
          <Icon className="size-6" name="chart" />
        </div>
        <span className="mt-4 rounded-full border border-amber-400/25 bg-amber-500/10 px-2.5 py-1 text-[11px] font-black uppercase tracking-wide text-amber-300">
          Requires tracking
        </span>
        <h2 className="mt-3 text-2xl font-black text-white">GMV &amp; Orders</h2>
        <p className="mt-2 max-w-xl text-sm leading-6 text-slate-400">
          Sales analytics will unlock when purchase events include the required
          order and money fields.
        </p>
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          {REQUIRED_FIELDS.map((field) => (
            <code
              className="rounded-lg border border-slate-700/70 bg-slate-950/60 px-3 py-1.5 font-mono text-xs text-cyan-100"
              key={field}
            >
              {field}
            </code>
          ))}
        </div>
      </div>
    </GlowCard>
  );
}
