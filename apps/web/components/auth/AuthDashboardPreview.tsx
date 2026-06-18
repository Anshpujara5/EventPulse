import { EventPulseLogo } from "@/components/common/EventPulseLogo";
import { sidebarItems, previewCategories, previewHealthRows, type StatItem } from "./auth-data";

export function AuthDashboardPreview({ stats }: { stats: readonly StatItem[] }) {
  return (
    <div className="rounded-xl border border-slate-600/45 bg-slate-950/70 p-2 shadow-[0_0_35px_rgba(14,165,233,0.14)]">
      <div className="grid overflow-hidden rounded-lg border border-white/10 bg-[#06101f] md:grid-cols-[130px_1fr]">
        <aside className="hidden border-r border-white/10 bg-white/3.5 p-4 md:block">
          <div className="mb-5 flex items-center gap-2">
            <EventPulseLogo className="flex size-10 items-center justify-center" />
            <span className="text-xs font-black text-white">EventPulse</span>
          </div>
          <div className="space-y-1.5">
            {sidebarItems.map((item, index) => (
              <div
                className={`rounded-md px-3 py-2 text-[11px] font-medium ${
                  index === 0
                    ? "bg-blue-600/70 text-white"
                    : "text-slate-300"
                }`}
                key={item}
              >
                {item}
              </div>
            ))}
          </div>
        </aside>

        <div className="p-4">
          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm font-black text-white">Overview</p>
            <span className="rounded-md border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] text-slate-300">
              Last 1 Hour
            </span>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            {stats.map(([label, value, trend], index) => (
              <div
                className="rounded-lg border border-white/10 bg-white/4.5 p-3"
                key={label}
              >
                <p className="text-[10px] text-slate-400">{label}</p>
                <p className="mt-2 text-xl font-black text-white">{value}</p>
                <p
                  className={`mt-1 text-[10px] ${
                    index === 2 ? "text-rose-300" : "text-emerald-300"
                  }`}
                >
                  {index === 2 ? "+" : "↑"} {trend}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-3 rounded-lg border border-white/10 bg-white/3.5 p-4">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs font-black text-white">Event Stream</p>
              <div className="flex gap-4 text-[10px] text-slate-400">
                <span className="text-cyan-300">Requests</span>
                <span className="text-rose-300">Errors</span>
              </div>
            </div>
            <svg className="h-24 w-full" viewBox="0 0 360 110">
              <path
                d="M0 86 C28 70 42 76 61 42 S99 74 124 54 158 84 188 48 223 75 250 52 292 76 360 57"
                fill="none"
                stroke="#0ea5e9"
                strokeWidth="3"
              />
              <path
                d="M0 98 C35 90 48 96 72 74 S112 95 140 76 180 94 214 78 250 96 282 80 322 93 360 84"
                fill="none"
                stroke="#ec4899"
                strokeWidth="2"
              />
              <g className="fill-slate-500 text-[10px]">
                <text x="0" y="108">
                  10:00
                </text>
                <text x="95" y="108">
                  10:15
                </text>
                <text x="190" y="108">
                  10:30
                </text>
                <text x="285" y="108">
                  11:00
                </text>
              </g>
            </svg>
          </div>

          <div className="mt-3 grid gap-3 sm:grid-cols-[0.9fr_1fr]">
            <div className="rounded-lg border border-white/10 bg-white/3.5 p-3">
              <p className="mb-3 text-xs font-black text-white">
                Event Categories
              </p>
              <div className="flex items-center gap-3">
                <div
                  className="size-16 rounded-full"
                  style={{
                    background:
                      "conic-gradient(#0ea5e9 0 32%,#8b5cf6 32% 56%,#ec4899 56% 74%,#22c55e 74% 88%,#f59e0b 88% 100%)",
                  }}
                >
                  <div className="m-4 size-8 rounded-full bg-[#06101f]" />
                </div>
                <div className="flex-1 space-y-1 text-[10px] text-slate-300">
                  {previewCategories.map((item) => (
                    <p key={item}>{item}</p>
                  ))}
                </div>
              </div>
            </div>
            <div className="rounded-lg border border-white/10 bg-white/3.5 p-3">
              <p className="mb-3 text-xs font-black text-white">
                System Health
              </p>
              <div className="space-y-2 text-[11px]">
                {previewHealthRows.map((item) => (
                  <p
                    className="flex items-center justify-between"
                    key={item}
                  >
                    <span className="text-slate-300">{item}</span>
                    <span className="rounded bg-emerald-400/10 px-1.5 py-0.5 text-[9px] font-black text-emerald-300">
                      Healthy
                    </span>
                  </p>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
