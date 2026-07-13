import type { CommerceFunnel, SessionFunnel } from "../analytics-types";
import { ConversionFunnelCard } from "../ConversionFunnelCard";

export function ConversionTab({
  sessionFunnel,
  commerceFunnel,
}: {
  sessionFunnel: SessionFunnel;
  commerceFunnel: CommerceFunnel;
}) {
  return (
    <section className="mt-5">
      <ConversionFunnelCard
        commerceFunnel={commerceFunnel}
        sessionFunnel={sessionFunnel}
      />
    </section>
  );
}
