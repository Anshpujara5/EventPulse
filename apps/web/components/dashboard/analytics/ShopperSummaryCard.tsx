import { GlowCard } from "@/components/common/GlowCard";
import { Icon } from "@/components/common/Icon";
import type { ShopperSummary } from "./analytics-types";

const STATS: {
  key: keyof ShopperSummary;
  label: string;
  tone: string;
  boxClassName: string;
  icon: string;
}[] = [
  {
    key: "uniqueCustomers",
    label: "Unique Customers",
    tone: "text-cyan-300",
    boxClassName: "border-cyan-400/25 bg-cyan-500/10",
    icon: "user",
  },
  {
    key: "uniqueSessions",
    label: "Sessions",
    tone: "text-violet-300",
    boxClassName: "border-violet-400/25 bg-violet-500/10",
    icon: "activity",
  },
  {
    key: "purchasingSessions",
    label: "Purchasing Sessions",
    tone: "text-emerald-300",
    boxClassName: "border-emerald-400/25 bg-emerald-500/10",
    icon: "check",
  },
];

export function ShopperSummaryCard({ summary }: { summary: ShopperSummary }) {
  return (
    <GlowCard className="p-5">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-lg font-black text-white">Shoppers &amp; Sessions</h2>
        <p className="text-xs text-slate-500">
          Based on events that include customerId and sessionId.
        </p>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        {STATS.map((stat) => (
          <div
            className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-950/50 px-4 py-3"
            key={stat.key}
          >
            <div
              className={`flex size-9 shrink-0 items-center justify-center rounded-full border ${stat.boxClassName} ${stat.tone}`}
            >
              <Icon name={stat.icon} className="size-4" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-slate-500">{stat.label}</p>
              <p className="text-xl font-black text-white">
                {summary[stat.key].toLocaleString()}
              </p>
            </div>
          </div>
        ))}
      </div>
    </GlowCard>
  );
}
