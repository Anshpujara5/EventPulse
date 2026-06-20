import { GlowCard } from "@/components/common/GlowCard";
import { Icon } from "@/components/common/Icon";
import { selectedApiKeyDetails } from "./api-keys-data";

export function ApiKeyDetailsPanel() {
  return (
    <GlowCard className="p-5">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-lg font-black text-white">API Key Details</h2>
        <button
          className="flex size-9 items-center justify-center rounded-lg border border-slate-700/80 bg-slate-950/45 text-cyan-300"
          type="button"
        >
          <Icon name="document" className="size-4" />
        </button>
      </div>

      <div className="mt-5 grid gap-3">
        {selectedApiKeyDetails.map(([label, value]) => (
          <div className="flex items-center justify-between gap-4 text-sm" key={label}>
            <span className="text-slate-500">{label}</span>
            <span className="truncate font-bold text-slate-200">{value}</span>
          </div>
        ))}
      </div>

      <div className="mt-5 rounded-xl border border-slate-800 bg-slate-950/80 p-4 font-mono text-xs text-cyan-100">
        Authorization: Bearer ep_live_••••••a91f
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        {["Copy", "Rotate", "Revoke"].map((action) => (
          <button
            className={`rounded-lg border px-3 py-2 text-xs font-black transition ${
              action === "Revoke"
                ? "border-rose-400/25 bg-rose-500/10 text-rose-300"
                : "border-slate-700/80 bg-slate-950/35 text-slate-300 hover:border-cyan-300/35 hover:text-cyan-300"
            }`}
            key={action}
            type="button"
          >
            {action}
          </button>
        ))}
      </div>
    </GlowCard>
  );
}
