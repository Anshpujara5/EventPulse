import { Icon } from "@/components/common/Icon";
import { defaultBottomBenefits } from "./auth-data";

export function AuthBottomBenefits() {
  return (
    <section className="relative z-10 mx-auto mt-8 max-w-305 rounded-2xl border border-white/10 bg-white/3.5 p-5 backdrop-blur">
      <div className="grid gap-5 md:grid-cols-[1.2fr_repeat(4,1fr)]">
        <div className="flex items-center gap-4">
          <div className="flex size-12 items-center justify-center rounded-full bg-blue-500/15 text-blue-300">
            <Icon name="bolt" className="size-7" />
          </div>
          <p className="max-w-52 text-lg font-semibold">
            Everything you need to ship reliable systems
          </p>
        </div>
        {defaultBottomBenefits.map(([title, description, icon]) => (
          <div
            className="flex items-center gap-3 border-white/10 md:border-l md:pl-5"
            key={title}
          >
            <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-blue-500/10 text-cyan-400">
              <Icon name={icon} className="size-6" />
            </div>
            <div>
              <p className="text-sm font-black text-white">{title}</p>
              <p className="mt-1 text-xs text-slate-400">{description}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
