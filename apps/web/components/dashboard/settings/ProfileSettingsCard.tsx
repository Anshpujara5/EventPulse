import { GlowCard } from "@/components/common/GlowCard";
import { Icon } from "@/components/common/Icon";
import { profileSettings } from "./settings-data";

export function ProfileSettingsCard() {
  return (
    <GlowCard className="p-5">
      <div className="flex items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-xl bg-blue-500/10 text-cyan-300">
          <Icon name="user" />
        </div>
        <h2 className="text-lg font-black text-white">Profile Settings</h2>
      </div>

      <div className="mt-7 flex flex-col gap-6 sm:flex-row sm:items-start">
        <div className="relative flex size-24 shrink-0 items-center justify-center rounded-full border-2 border-blue-500 bg-slate-950 text-3xl font-black text-white shadow-[0_0_28px_rgba(37,99,235,0.28)]">
          AP
          <span className="absolute bottom-2 right-2 size-3 rounded-full bg-emerald-400 ring-4 ring-[#071426]" />
        </div>
        <div className="min-w-0 flex-1">
          {profileSettings.map(([label, value]) => (
            <div className="grid grid-cols-[80px_1fr] border-b border-slate-800/80 py-3 last:border-b-0" key={label}>
              <span className="text-sm text-slate-400">{label}</span>
              <span className="text-sm font-bold text-white">{value}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-6 flex justify-center">
        <button className="h-11 rounded-xl bg-linear-to-r from-blue-600 to-violet-600 px-6 text-sm font-black text-white shadow-[0_0_24px_rgba(79,70,229,0.25)]" type="button">
          Update Profile
        </button>
      </div>
    </GlowCard>
  );
}
