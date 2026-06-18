import { EventPulseLogo } from "@/components/common/EventPulseLogo";
import { GlowCard } from "@/components/common/GlowCard";
import { Icon } from "@/components/common/Icon";
import { navItems } from "./dashboard-data";

export function DashboardSidebar() {
  return (
    <aside className="border-b border-slate-800/80 bg-[#061121]/95 lg:sticky lg:top-0 lg:h-screen lg:border-b-0 lg:border-r">
      <div className="flex h-16 items-center gap-2 px-5">
        <EventPulseLogo
          className="flex size-8 items-center justify-center"
          svgClassName="h-full w-full text-cyan-400 drop-shadow-[0_0_12px_rgba(34,211,238,0.7)]"
        />
        <span className="text-2xl font-black tracking-tight">EventPulse</span>
      </div>
      <nav className="grid gap-1 px-4 py-3 sm:grid-cols-4 lg:block lg:space-y-2">
        {navItems.map(([item, icon], index) => (
          <a
            className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-bold transition ${
              index === 0
                ? "border border-blue-400/40 bg-blue-600/35 text-white shadow-[0_0_24px_rgba(37,99,235,0.16)]"
                : "text-slate-400 hover:bg-white/4 hover:text-white"
            }`}
            href="#"
            key={item}
          >
            <Icon name={icon} className="size-5" />
            <span>{item}</span>
            {item === "Alerts" ? (
              <span className="ml-auto rounded-full bg-rose-500 px-2 py-0.5 text-xs text-white">3</span>
            ) : null}
          </a>
        ))}
      </nav>
      <div className="hidden px-4 lg:absolute lg:bottom-4 lg:left-0 lg:right-0 lg:block">
        <GlowCard className="mb-4 p-4">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-full bg-violet-500/15 text-violet-300">
              <Icon name="shield" />
            </div>
            <div>
              <p className="text-xs text-slate-500">You&apos;re on</p>
              <p className="font-bold text-white">Pro Plan</p>
            </div>
          </div>
          <p className="mt-4 text-xs text-slate-500">Events this month</p>
          <div className="mt-1 flex items-center justify-between text-xs">
            <span>125K / 1M</span>
            <span className="text-slate-500">12%</span>
          </div>
          <div className="mt-2 h-2 rounded-full bg-slate-800">
            <div className="h-full w-[12%] rounded-full bg-blue-500" />
          </div>
          <button className="mt-4 w-full rounded-lg bg-violet-600/25 px-4 py-2 text-sm font-bold text-violet-100" type="button">
            Upgrade Plan →
          </button>
        </GlowCard>
        <div className="flex items-center justify-between px-3 py-2 text-sm font-bold text-slate-400">
          <span>Docs</span>
          <span>Support</span>
        </div>
      </div>
    </aside>
  );
}
