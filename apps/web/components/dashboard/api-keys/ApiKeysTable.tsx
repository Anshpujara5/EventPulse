import { Icon } from "@/components/common/Icon";
import type { ApiKey } from "./api-key-types";

function statusClassName(status: ApiKey["status"]) {
  if (status === "REVOKED") {
    return "border-rose-400/20 bg-rose-500/10 text-rose-300";
  }

  return "border-emerald-400/20 bg-emerald-500/10 text-emerald-300";
}

function statusDotClassName(status: ApiKey["status"]) {
  if (status === "REVOKED") {
    return "bg-rose-400";
  }

  return "bg-emerald-400";
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function formatLastUsed(value: string | null) {
  return value ? formatDate(value) : "Never";
}

export function ApiKeysTable({
  apiKeys,
  error,
  isLoading,
  onCreateClick,
  onRetry,
  onRevoke,
  onSelect,
  selectedApiKeyId,
}: {
  apiKeys: ApiKey[];
  error: string;
  isLoading: boolean;
  onCreateClick: () => void;
  onRetry: () => void;
  onRevoke: (id: string) => void;
  onSelect: (id: string) => void;
  selectedApiKeyId?: string;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-700/70 bg-[#071426]/85 shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_18px_50px_rgba(0,0,0,0.18)]">
      <div className="hidden grid-cols-[1.15fr_1.05fr_1.3fr_0.95fr_0.75fr_0.8fr_0.9fr_1.05fr] px-4 py-4 text-xs font-bold uppercase tracking-wide text-slate-500 xl:grid">
        <span>Key Name</span>
        <span>Project</span>
        <span>Key Prefix / Masked Key</span>
        <span>Permissions</span>
        <span>Status</span>
        <span>Last Used</span>
        <span>Created</span>
        <span className="text-right">Actions</span>
      </div>

      {isLoading ? (
        <div className="border-t border-slate-800/80 px-4 py-12 text-center text-sm font-bold text-slate-400">
          Loading API keys...
        </div>
      ) : error ? (
        <div className="grid gap-4 border-t border-slate-800/80 px-4 py-12 text-center">
          <p className="text-sm font-bold text-rose-300">{error}</p>
          <button
            className="mx-auto h-10 rounded-lg border border-slate-700/80 bg-slate-950/35 px-4 text-xs font-black text-slate-300 transition hover:border-cyan-300/35 hover:text-cyan-300"
            onClick={onRetry}
            type="button"
          >
            Retry
          </button>
        </div>
      ) : apiKeys.length === 0 ? (
        <div className="grid gap-4 border-t border-slate-800/80 px-4 py-12 text-center">
          <div>
            <h2 className="text-lg font-black text-white">No API keys yet</h2>
            <p className="mt-1 text-sm text-slate-400">
              Create your first project-scoped key to start sending events.
            </p>
          </div>
          <button
            className="mx-auto h-10 rounded-lg bg-linear-to-r from-blue-600 to-violet-600 px-4 text-xs font-black text-white transition hover:brightness-110"
            onClick={onCreateClick}
            type="button"
          >
            Create API Key
          </button>
        </div>
      ) : (
        apiKeys.map((apiKey) => (
          <div
            className={`grid gap-3 border-t border-slate-800/80 px-4 py-4 text-sm first:border-t-0 xl:grid-cols-[1.15fr_1.05fr_1.3fr_0.95fr_0.75fr_0.8fr_0.9fr_1.05fr] xl:items-center ${
              apiKey.id === selectedApiKeyId
                ? "bg-blue-500/8 ring-1 ring-inset ring-blue-400/45"
                : ""
            }`}
            key={apiKey.id}
          >
            <p className="truncate font-black text-white" title={apiKey.name}>
              {apiKey.name}
            </p>
            <p className="truncate text-slate-400" title={apiKey.project.name}>
              {apiKey.project.name}
            </p>
            <p className="flex min-w-0 items-center gap-2 font-mono text-xs text-slate-300">
              <span className="truncate" title={apiKey.maskedKey}>
                {apiKey.maskedKey}
              </span>
              <Icon name="document" className="size-4 shrink-0 text-slate-500" />
            </p>
            <p className="truncate text-slate-300" title={apiKey.permissions}>
              {apiKey.permissions}
            </p>
            <div>
              <span
                className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-black ${statusClassName(apiKey.status)}`}
              >
                <span className={`size-2 rounded-full ${statusDotClassName(apiKey.status)}`} />
                {apiKey.status === "ACTIVE" ? "Active" : "Revoked"}
              </span>
            </div>
            <p className="text-slate-400">{formatLastUsed(apiKey.lastUsedAt)}</p>
            <p className="text-slate-400">{formatDate(apiKey.createdAt)}</p>
            <div className="flex flex-wrap items-center gap-2 xl:justify-end">
              <button
                className="rounded-lg border border-slate-700/80 bg-slate-950/35 px-3 py-2 text-xs font-bold text-slate-300 transition hover:border-cyan-300/35 hover:text-cyan-300"
                onClick={() => onSelect(apiKey.id)}
                type="button"
              >
                View
              </button>
              <button
                className="rounded-lg border border-slate-700/80 bg-slate-950/35 px-3 py-2 text-xs font-bold text-slate-300 transition hover:border-cyan-300/35 hover:text-cyan-300"
                onClick={() => navigator.clipboard.writeText(apiKey.maskedKey)}
                type="button"
              >
                Copy
              </button>
              <button
                className="rounded-lg border border-rose-400/20 bg-rose-500/10 px-3 py-2 text-xs font-bold text-rose-300 transition hover:bg-rose-500/15 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={apiKey.status === "REVOKED"}
                onClick={() => onRevoke(apiKey.id)}
                type="button"
              >
                Revoke
              </button>
            </div>
          </div>
        ))
      )}

      <div className="flex flex-col gap-3 border-t border-slate-800/80 px-4 py-4 text-sm text-slate-400 sm:flex-row sm:items-center sm:justify-between">
        <span>
          Showing {apiKeys.length === 0 ? "0" : `1 to ${apiKeys.length}`} of{" "}
          {apiKeys.length} results
        </span>
        <div className="flex items-center gap-2">
          <button className="rounded-lg border border-slate-700/80 px-3 py-2 text-slate-500" type="button">
            ‹
          </button>
          <button className="rounded-lg border border-blue-400/40 bg-blue-600/25 px-3 py-2 font-bold text-cyan-300" type="button">
            1
          </button>
          <button className="rounded-lg border border-slate-700/80 px-3 py-2 text-slate-500" type="button">
            ›
          </button>
        </div>
      </div>
    </section>
  );
}
