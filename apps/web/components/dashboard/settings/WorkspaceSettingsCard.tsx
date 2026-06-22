import { GlowCard } from "@/components/common/GlowCard";
import { Icon } from "@/components/common/Icon";
import { workspaceSettings } from "./settings-data";

export function WorkspaceSettingsCard() {
  return (
    <GlowCard className="p-5">
      <div className="flex items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-xl bg-blue-500/10 text-cyan-300">
          <Icon name="database" />
        </div>
        <h2 className="text-lg font-black text-white">Workspace Settings</h2>
      </div>

      <div className="mt-5 overflow-hidden rounded-xl border border-slate-700/70">
        {workspaceSettings.map(([label, value], index) => (
          <div className="flex items-center justify-between border-b border-slate-800/80 px-4 py-4 last:border-b-0" key={label}>
            <span className="text-sm text-slate-400">{label}</span>
            <button className="flex items-center gap-2 text-sm font-bold text-white" type="button">
              {value}
              {index > 1 ? <span className="text-slate-500">⌄</span> : null}
            </button>
          </div>
        ))}
      </div>

      <div className="mt-6 flex justify-center">
        <button className="h-11 rounded-xl bg-linear-to-r from-blue-600 to-violet-600 px-6 text-sm font-black text-white shadow-[0_0_24px_rgba(79,70,229,0.25)]" type="button">
          Save Changes
        </button>
      </div>
    </GlowCard>
  );
}
