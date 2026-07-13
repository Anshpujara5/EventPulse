import { GlowCard } from "@/components/common/GlowCard";
import { Icon } from "@/components/common/Icon";
import type { CommerceFunnel, SessionFunnel } from "./analytics-types";
import { RawCommerceActivitySection } from "./RawCommerceActivitySection";
import { SessionConversionSection } from "./SessionConversionSection";

export function ConversionFunnelCard({
  sessionFunnel,
  commerceFunnel,
}: {
  sessionFunnel: SessionFunnel;
  commerceFunnel: CommerceFunnel;
}) {
  return (
    <GlowCard className="p-5">
      <div className="flex items-start gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-full border border-violet-400/25 bg-violet-500/10 text-violet-300">
          <Icon className="size-5" name="user" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-black text-white">
              Conversion Funnel
            </h2>
            <span className="rounded-full border border-violet-400/25 bg-violet-500/10 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-violet-300">
              Session based
            </span>
          </div>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            Track how shopper sessions move from product interest to purchase.
          </p>
        </div>
      </div>

      <SessionConversionSection funnel={sessionFunnel} />
      <RawCommerceActivitySection funnel={commerceFunnel} />
    </GlowCard>
  );
}
