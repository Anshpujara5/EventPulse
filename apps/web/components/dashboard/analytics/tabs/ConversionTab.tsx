import type { CommerceFunnel, SessionFunnel } from "../analytics-types";
import { CommerceFunnelCard } from "../CommerceFunnelCard";
import { SessionFunnelCard } from "../SessionFunnelCard";

export function ConversionTab({
  sessionFunnel,
  commerceFunnel,
}: {
  sessionFunnel: SessionFunnel;
  commerceFunnel: CommerceFunnel;
}) {
  return (
    <section className="mt-5 grid gap-4 xl:grid-cols-2">
      <SessionFunnelCard funnel={sessionFunnel} />
      <CommerceFunnelCard funnel={commerceFunnel} />
    </section>
  );
}
