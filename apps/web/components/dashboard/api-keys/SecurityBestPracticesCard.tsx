import { GlowCard } from "@/components/common/GlowCard";
import { Icon } from "@/components/common/Icon";
import { bestPractices } from "./api-keys-data";

export function SecurityBestPracticesCard() {
  return (
    <GlowCard className="p-5">
      <div className="flex items-center gap-3">
        <Icon name="shield" className="size-5 text-cyan-400" />
        <h2 className="text-lg font-black text-white">Security Best Practices</h2>
      </div>
      <div className="mt-5 grid gap-4">
        {bestPractices.map((item) => (
          <div className="flex gap-3 text-sm text-slate-300" key={item}>
            <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border border-cyan-400/35 text-cyan-300">
              <Icon name="check" className="size-3" />
            </span>
            <span>{item}</span>
          </div>
        ))}
      </div>
    </GlowCard>
  );
}
