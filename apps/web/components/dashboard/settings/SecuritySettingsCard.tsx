import { GlowCard } from "@/components/common/GlowCard";
import { Icon } from "@/components/common/Icon";
import { securitySettings } from "./settings-data";

export function SecuritySettingsCard() {
  return (
    <GlowCard className="p-5">
      <div className="flex items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-xl bg-blue-500/10 text-cyan-300">
          <Icon name="shield" />
        </div>
        <h2 className="text-lg font-black text-white">Security Settings</h2>
      </div>

      <div className="mt-5">
        {securitySettings.map(([label, value, icon]) => (
          <button className="flex w-full items-center gap-3 border-b border-slate-800/80 py-4 text-left last:border-b-0" key={label} type="button">
            <Icon name={icon} className="size-5 text-slate-400" />
            <span className="min-w-0 flex-1 text-sm text-slate-300">{label}</span>
            <span className={`text-sm font-bold ${value === "Enabled" ? "text-emerald-400" : "text-white"}`}>{value}</span>
            <span className="text-xl text-slate-500">›</span>
          </button>
        ))}
      </div>

      <div className="mt-6 flex justify-center">
        <button className="h-11 rounded-xl bg-linear-to-r from-blue-600 to-violet-600 px-6 text-sm font-black text-white shadow-[0_0_24px_rgba(79,70,229,0.25)]" type="button">
          Manage Security
        </button>
      </div>
    </GlowCard>
  );
}
