import { GlowCard } from "@/components/common/GlowCard";
import { Icon } from "@/components/common/Icon";
import Link from "next/link";

const bestPractices = [
  "Rotate production keys every 90 days",
  "Use separate keys for client and server events",
  "Revoke unused keys immediately",
  "Never expose server keys in frontend code",
] as const;

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
      <div className="mt-5 border-t border-slate-800/70 pt-4">
        <Link
          className="inline-flex items-center gap-2 text-sm font-bold text-cyan-300 transition hover:text-cyan-200"
          href="/dashboard/docs"
        >
          <Icon name="document" className="size-4" />
          Read the ingestion docs →
        </Link>
      </div>
    </GlowCard>
  );
}
