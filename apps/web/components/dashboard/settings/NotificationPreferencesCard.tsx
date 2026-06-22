import { GlowCard } from "@/components/common/GlowCard";
import { Icon } from "@/components/common/Icon";
import { notificationPreferences } from "./settings-data";

export function NotificationPreferencesCard() {
  return (
    <GlowCard className="p-5">
      <div className="flex items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-xl bg-blue-500/10 text-cyan-300">
          <Icon name="bell" />
        </div>
        <h2 className="text-lg font-black text-white">Notification Preferences</h2>
      </div>

      <div className="mt-5">
        {notificationPreferences.map(([label, channel, icon]) => (
          <div className="flex items-center gap-3 border-b border-slate-800/80 py-4 last:border-b-0" key={label}>
            <Icon name={icon} className="size-5 text-slate-400" />
            <span className="min-w-0 flex-1 text-sm text-slate-300">{label}</span>
            <span className="text-sm text-slate-300">{channel}</span>
            <button className="relative h-6 w-11 rounded-full bg-blue-600 shadow-[0_0_16px_rgba(37,99,235,0.35)]" type="button" aria-label={`${label} enabled`}>
              <span className="absolute right-1 top-1 size-4 rounded-full bg-white" />
            </button>
          </div>
        ))}
      </div>
    </GlowCard>
  );
}
