import { Icon } from "@/components/common/Icon";
import { platformStats } from "./landing-data";

export function StatsSection() {
  return (
    <section className="relative z-10 mx-auto max-w-300 px-4 py-4 sm:px-6">
      <div className="grid overflow-hidden rounded-xl border border-blue-300/25 bg-white/4.5 shadow-[0_0_40px_rgba(37,99,235,0.16)] backdrop-blur md:grid-cols-4">
        {platformStats.map((stat) => (
          <div
            className="flex items-center gap-5 px-9 py-5 md:border-r md:border-white/10 last:md:border-r-0"
            key={stat.label}
          >
            <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-blue-500/15 text-cyan-400 shadow-[0_0_22px_rgba(59,130,246,0.25)]">
              <Icon name={stat.icon} className="size-7" />
            </div>
            <div>
              <p className="text-2xl font-black leading-tight text-white">
                {stat.value}
              </p>
              <p className="text-sm text-slate-300">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
