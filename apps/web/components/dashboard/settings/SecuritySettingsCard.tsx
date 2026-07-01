import { GlowCard } from "@/components/common/GlowCard";
import { Icon } from "@/components/common/Icon";

type ValidIcon = "shield" | "clock" | "key" | "user";

const rows: { label: string; value: string; icon: ValidIcon; badge: string }[] = [
  {
    label: "Two-factor auth",
    value: "Not configured",
    icon: "shield",
    badge: "border-slate-600/50 bg-slate-800/50 text-slate-400",
  },
  {
    label: "Session timeout",
    value: "Not configured",
    icon: "clock",
    badge: "border-slate-600/50 bg-slate-800/50 text-slate-400",
  },
  {
    label: "API key rotation",
    value: "Not configured",
    icon: "key",
    badge: "border-slate-600/50 bg-slate-800/50 text-slate-400",
  },
  {
    label: "SSO",
    value: "Coming soon",
    icon: "user",
    badge: "border-slate-600/50 bg-slate-800/50 text-slate-400",
  },
];

export function SecuritySettingsCard() {
  return (
    <GlowCard className="flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-2.5 border-b border-slate-800/60 px-5 py-4">
        <div className="flex size-7 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-400/20">
          <Icon className="size-3.5" name="shield" />
        </div>
        <span className="text-sm font-bold text-white">Security</span>
      </div>

      {/* Rows */}
      <div className="flex flex-1 flex-col divide-y divide-slate-800/50 px-5">
        {rows.map((row) => (
          <div className="flex items-center gap-3 py-3.5" key={row.label}>
            <Icon className="size-3.5 shrink-0 text-slate-600" name={row.icon} />
            <span className="min-w-0 flex-1 text-sm text-slate-400">{row.label}</span>
            <span
              className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold ${row.badge}`}
            >
              {row.value}
            </span>
          </div>
        ))}
      </div>

      {/* CTA — disabled, not yet wired */}
      <div className="border-t border-slate-800/60 px-5 py-4">
        <button
          className="h-8 w-full cursor-not-allowed rounded-lg border border-slate-700/70 bg-slate-900/60 text-xs font-semibold text-slate-500"
          disabled
          title="Coming soon"
          type="button"
        >
          Configure Security — coming soon
        </button>
      </div>
    </GlowCard>
  );
}
