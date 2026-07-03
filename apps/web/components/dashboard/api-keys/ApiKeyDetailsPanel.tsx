import { GlowCard } from "@/components/common/GlowCard";
import { Icon } from "@/components/common/Icon";
import type { ApiKey } from "./api-key-types";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

export function ApiKeyDetailsPanel({
  apiKey,
  isRevoking,
  onRevoke,
  rawApiKey,
}: {
  apiKey?: ApiKey;
  isRevoking?: boolean;
  onRevoke: (id: string) => void;
  rawApiKey?: string;
}) {
  const detailRows: [string, string][] = apiKey
    ? [
        ["Name", apiKey.name],
        ["Project", apiKey.project.name],
        ["Status", apiKey.status === "ACTIVE" ? "Active" : "Revoked"],
        [
          "Last Used",
          apiKey.lastUsedAt ? formatDate(apiKey.lastUsedAt) : "Never used",
        ],
        ...(apiKey.project.status === "INACTIVE"
          ? ([["Ingestion", "Paused (project archived)"]] as [string, string][])
          : []),
        ["Permissions", apiKey.permissions],
        ["Key Prefix", apiKey.keyPrefix],
        ["Created", formatDate(apiKey.createdAt)],
      ]
    : [];

  return (
    <GlowCard className="p-5">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-lg font-black text-white">API Key Details</h2>
        <button
          className="flex size-9 items-center justify-center rounded-lg border border-slate-700/80 bg-slate-950/45 text-cyan-300"
          onClick={() =>
            apiKey ? navigator.clipboard.writeText(rawApiKey ?? apiKey.maskedKey) : undefined
          }
          type="button"
        >
          <Icon name="document" className="size-4" />
        </button>
      </div>

      {apiKey ? (
        <>
          <div className="mt-5 grid gap-3">
            {detailRows.map(([label, value]) => (
              <div className="flex items-center justify-between gap-4 text-sm" key={label}>
                <span className="text-slate-500">{label}</span>
                <span className="truncate font-bold text-slate-200" title={value}>
                  {value}
                </span>
              </div>
            ))}
          </div>

          {rawApiKey ? (
            <p className="mt-5 rounded-xl border border-cyan-400/25 bg-cyan-500/10 px-4 py-3 text-xs font-bold text-cyan-100">
              Full key is visible one time. Copy it before leaving this page.
            </p>
          ) : null}

          <div className="mt-5 rounded-xl border border-slate-800 bg-slate-950/80 p-4 font-mono text-xs text-cyan-100">
            <p className="truncate" title={rawApiKey ?? apiKey.maskedKey}>
              Authorization: Bearer {rawApiKey ?? apiKey.maskedKey}
            </p>
          </div>

          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            <button
              className="rounded-lg border border-slate-700/80 bg-slate-950/35 px-3 py-2 text-xs font-black text-slate-300 transition hover:border-cyan-300/35 hover:text-cyan-300"
              onClick={() => navigator.clipboard.writeText(rawApiKey ?? apiKey.maskedKey)}
              type="button"
            >
              Copy
            </button>
            <button
              className="rounded-lg border border-rose-400/25 bg-rose-500/10 px-3 py-2 text-xs font-black text-rose-300 transition hover:bg-rose-500/15 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={apiKey.status === "REVOKED" || !!isRevoking}
              onClick={() => onRevoke(apiKey.id)}
              type="button"
            >
              Revoke
            </button>
          </div>
        </>
      ) : (
        <div className="mt-5 rounded-xl border border-slate-800 bg-slate-950/45 p-4 text-sm text-slate-400">
          Select an API key to view its safe display details.
        </div>
      )}
    </GlowCard>
  );
}
