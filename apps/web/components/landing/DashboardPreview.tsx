import { EventPulseLogo } from "@/components/common/EventPulseLogo";
import { Icon } from "@/components/common/Icon";
import { categories, eventRows, health, overviewStats } from "./landing-data";

export function DashboardPreview() {
  return (
    <div className="rounded-[18px] border border-slate-600/60 bg-slate-950/80 p-2 shadow-[0_0_55px_rgba(37,99,235,0.22)] backdrop-blur-xl">
      <div className="grid overflow-hidden rounded-2xl border border-white/10 bg-[#07101f] md:grid-cols-[126px_1fr]">
        <aside className="hidden border-r border-white/10 bg-white/3.5 p-4 md:block">
          <div className="mb-5 flex items-center gap-2">
            <EventPulseLogo compact />
            <span className="text-sm font-bold text-white">EventPulse</span>
          </div>
          <div className="space-y-1.5 text-[11px] text-slate-300">
            {["Overview", "Events", "Alerts", "Analytics", "Servers", "API Keys", "Projects", "Settings"].map(
              (item, index) => (
                <div
                  className={`flex items-center gap-2 rounded-md px-2.5 py-2 ${
                    index === 0 ? "bg-blue-600/75 text-white" : "hover:bg-white/5"
                  }`}
                  key={item}
                >
                  <span className="size-1.5 rounded-full bg-cyan-300" />
                  {item}
                </div>
              ),
            )}
          </div>
          <div className="mt-20 space-y-2 text-[11px] text-slate-400">
            <p>Docs</p>
            <p>Support</p>
          </div>
        </aside>

        <div className="p-4">
          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm font-bold text-white">Overview</p>
            <div className="flex items-center gap-2">
              <span className="rounded-md border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] text-slate-300">
                Last 1 Hour
              </span>
              <span className="flex size-7 items-center justify-center rounded-md border border-white/10 bg-white/5 text-cyan-300">
                <Icon name="spark" className="size-4" />
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
            {overviewStats.map((stat, index) => (
              <div
                className="rounded-lg border border-white/10 bg-white/4.5 p-3"
                key={stat.label}
              >
                <div className="flex items-start justify-between">
                  <p className="text-[10px] text-slate-400">{stat.label}</p>
                  <span
                    className={`flex size-5 items-center justify-center rounded bg-white/5 ${
                      index === 2 ? "text-rose-300" : "text-cyan-300"
                    }`}
                  >
                    <Icon name={stat.icon} className="size-3.5" />
                  </span>
                </div>
                <p className="mt-1 text-xl font-extrabold text-white">
                  {stat.value}
                </p>
                <div className="mt-1 flex items-center gap-1 text-[10px] text-emerald-300">
                  <span>{index === 2 ? "+" : "v"}</span>
                  {stat.trend}
                </div>
                <svg className="mt-1 h-5 w-full text-cyan-400" viewBox="0 0 100 24">
                  <polyline
                    fill="none"
                    points="0,20 14,17 25,19 36,12 48,14 60,9 72,11 85,5 100,7"
                    stroke="currentColor"
                    strokeWidth="2"
                  />
                </svg>
              </div>
            ))}
          </div>

          <div className="mt-3 grid gap-3 lg:grid-cols-[1fr_1.15fr]">
            <div className="rounded-lg border border-white/10 bg-white/3.5 p-3">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-xs font-bold text-white">Event Stream</p>
                <span className="rounded-full bg-emerald-400/10 px-2 py-0.5 text-[10px] text-emerald-300">
                  Live
                </span>
              </div>
              <div className="space-y-1.5">
                {eventRows.map(([event, source, time], index) => (
                  <div
                    className="grid grid-cols-[18px_1fr_auto] items-center gap-2 rounded-md bg-slate-950/45 px-2 py-1.5"
                    key={event}
                  >
                    <span
                      className={`size-4 rounded-full ${
                        index === 4 ? "bg-rose-500/25" : "bg-cyan-400/15"
                      }`}
                    />
                    <span>
                      <span className="block text-[11px] font-medium text-white">
                        {event}
                      </span>
                      <span className="block truncate text-[9px] text-slate-500">
                        {source}
                      </span>
                    </span>
                    <span className="text-[9px] text-slate-500">{time}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-lg border border-white/10 bg-white/3.5 p-3">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-xs font-bold text-white">API Traffic</p>
                <span className="text-[10px] text-cyan-300">View details</span>
              </div>
              <svg className="h-28 w-full" viewBox="0 0 320 120">
                <path
                  d="M0 96 C28 72 35 76 54 42 S90 75 112 43 145 78 170 47 202 74 228 44 262 73 320 52"
                  fill="none"
                  stroke="#0ea5e9"
                  strokeWidth="3"
                />
                <path
                  d="M0 104 C30 92 48 98 72 72 S106 92 130 78 168 98 194 72 234 95 260 80 288 92 320 77"
                  fill="none"
                  stroke="#ec4899"
                  strokeWidth="2"
                />
                <g className="text-[9px] fill-slate-500">
                  <text x="0" y="118">10:45</text>
                  <text x="82" y="118">11:00</text>
                  <text x="165" y="118">11:15</text>
                  <text x="248" y="118">11:45</text>
                </g>
              </svg>
            </div>
          </div>

          <div className="mt-3 grid gap-3 md:grid-cols-[1fr_1fr]">
            <div className="rounded-lg border border-white/10 bg-white/3.5 p-3">
              <p className="mb-2 text-xs font-bold text-white">Event Categories</p>
              <div className="flex items-center gap-4">
                <div
                  className="size-16 rounded-full"
                  style={{
                    background:
                      "conic-gradient(#0ea5e9 0 32%, #8b5cf6 32% 56%, #ec4899 56% 74%, #22c55e 74% 88%, #f59e0b 88% 100%)",
                  }}
                >
                  <div className="m-4 size-8 rounded-full bg-[#07101f]" />
                </div>
                <div className="flex-1 space-y-1">
                  {categories.map(([name, percent]) => (
                    <div
                      className="flex justify-between text-[10px] text-slate-300"
                      key={name}
                    >
                      <span>{name}</span>
                      <span>{percent}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="rounded-lg border border-white/10 bg-white/3.5 p-3">
              <p className="mb-2 text-xs font-bold text-white">System Health</p>
              <div className="space-y-2">
                {health.map((item) => (
                  <div className="flex items-center justify-between text-[11px]" key={item}>
                    <span className="flex items-center gap-2 text-slate-300">
                      <span className="size-1.5 rounded-full bg-emerald-400" />
                      {item}
                    </span>
                    <span className="rounded bg-emerald-400/10 px-1.5 py-0.5 text-[9px] font-bold text-emerald-300">
                      Healthy
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
