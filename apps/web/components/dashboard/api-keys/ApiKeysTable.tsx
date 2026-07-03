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
  return value ? formatDate(value) : "Never used";
}

function KeyActions({
  apiKey,
  isRevoking,
  onRevoke,
}: {
  apiKey: ApiKey;
  isRevoking: boolean;
  onRevoke: (id: string) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <button
        className="rounded-lg border border-slate-700/80 bg-slate-950/35 px-2.5 py-1.5 text-[11px] font-bold text-slate-300 transition hover:border-cyan-300/35 hover:text-cyan-300"
        onClick={(event) => {
          event.stopPropagation();
          navigator.clipboard.writeText(apiKey.keyPrefix);
        }}
        title="Copy the non-secret key prefix. The full key is only shown once at creation."
        type="button"
      >
        Copy prefix
      </button>
      <button
        className="rounded-lg border border-rose-400/20 bg-rose-500/10 px-2.5 py-1.5 text-[11px] font-bold text-rose-300 transition hover:bg-rose-500/15 disabled:cursor-not-allowed disabled:opacity-50"
        disabled={apiKey.status === "REVOKED" || isRevoking}
        onClick={(event) => {
          event.stopPropagation();
          onRevoke(apiKey.id);
        }}
        type="button"
      >
        Revoke
      </button>
    </div>
  );
}

export function ApiKeysTable({
  apiKeys,
  error,
  isLoading,
  isRevoking,
  onCreateClick,
  onRetry,
  onRevoke,
  onSelect,
  selectedApiKeyId,
}: {
  apiKeys: ApiKey[];
  error: string;
  isLoading: boolean;
  isRevoking: boolean;
  onCreateClick: () => void;
  onRetry: () => void;
  onRevoke: (id: string) => void;
  onSelect: (id: string) => void;
  selectedApiKeyId?: string;
}) {
  return (
    <section className="max-w-full overflow-hidden rounded-2xl border border-slate-700/70 bg-[#071426]/85 shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_18px_50px_rgba(0,0,0,0.18)]">
      {isLoading ? (
        <div className="px-4 py-12 text-center text-sm font-bold text-slate-400">
          Loading API keys...
        </div>
      ) : error ? (
        <div className="grid gap-4 px-4 py-12 text-center">
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
        <div className="grid gap-4 px-4 py-12 text-center">
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
        <>
          {/* Below 2xl: labeled stacked cards. A full dashboard-width dense
              table needs real room (8 columns + actions); on typical laptop
              widths (below 1536px) there usually isn't enough, especially
              with the aside panel present, so cards read cleanly with no
              horizontal scroll needed at all. */}
          <div className="2xl:hidden">
            {apiKeys.map((apiKey) => (
              <div
                className={`cursor-pointer border-t border-slate-800/80 px-4 py-4 text-sm outline-none transition first:border-t-0 hover:bg-white/[0.025] focus-visible:bg-white/[0.025] ${
                  apiKey.id === selectedApiKeyId
                    ? "bg-blue-500/8 ring-1 ring-inset ring-blue-400/45"
                    : ""
                }`}
                key={apiKey.id}
                onClick={() => onSelect(apiKey.id)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onSelect(apiKey.id);
                  }
                }}
                role="button"
                tabIndex={0}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-black text-white" title={apiKey.name}>
                      {apiKey.name}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-slate-400" title={apiKey.project.name}>
                      {apiKey.project.name}
                    </p>
                    {apiKey.project.status === "INACTIVE" ? (
                      <p className="mt-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-300/90">
                        Ingestion paused
                      </p>
                    ) : null}
                  </div>
                  <span
                    className={`inline-flex shrink-0 items-center gap-2 rounded-full border px-2.5 py-1 text-[11px] font-black ${statusClassName(apiKey.status)}`}
                  >
                    <span className={`size-1.5 rounded-full ${statusDotClassName(apiKey.status)}`} />
                    {apiKey.status === "ACTIVE" ? "Active" : "Revoked"}
                  </span>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2.5 text-xs sm:grid-cols-4">
                  <div className="min-w-0">
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">
                      Key
                    </p>
                    <p className="mt-0.5 truncate font-mono text-slate-300" title={apiKey.maskedKey}>
                      {apiKey.maskedKey}
                    </p>
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">
                      Permissions
                    </p>
                    <p className="mt-0.5 truncate text-slate-300" title={apiKey.permissions}>
                      {apiKey.permissions}
                    </p>
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">
                      Last Used
                    </p>
                    <p className="mt-0.5 truncate text-slate-300">
                      {formatLastUsed(apiKey.lastUsedAt)}
                    </p>
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">
                      Created
                    </p>
                    <p className="mt-0.5 truncate text-slate-300">
                      {formatDate(apiKey.createdAt)}
                    </p>
                  </div>
                </div>

                <div className="mt-3">
                  <KeyActions apiKey={apiKey} isRevoking={isRevoking} onRevoke={onRevoke} />
                </div>
              </div>
            ))}
          </div>

          {/* 2xl and up: dense table. overflow-x-auto + a min width is a
              safety net for the low end of the 2xl range, where the aside
              panel can still make things tight. */}
          <div className="hidden 2xl:block">
            <div className="overflow-x-auto">
              <div className="min-w-[1040px]">
                <div className="grid grid-cols-[1.1fr_1fr_1.25fr_0.85fr_0.7fr_0.75fr_0.85fr_1.1fr] px-4 py-4 text-xs font-bold uppercase tracking-wide text-slate-500">
                  <span>Key Name</span>
                  <span>Project</span>
                  <span>Key Prefix / Masked Key</span>
                  <span>Permissions</span>
                  <span>Status</span>
                  <span>Last Used</span>
                  <span>Created</span>
                  <span className="text-right">Actions</span>
                </div>

                {apiKeys.map((apiKey) => (
                  <div
                    className={`grid cursor-pointer grid-cols-[1.1fr_1fr_1.25fr_0.85fr_0.7fr_0.75fr_0.85fr_1.1fr] items-center gap-3 border-t border-slate-800/80 px-4 py-4 text-sm outline-none transition first:border-t-0 hover:bg-white/[0.025] focus-visible:bg-white/[0.025] ${
                      apiKey.id === selectedApiKeyId
                        ? "bg-blue-500/8 ring-1 ring-inset ring-blue-400/45"
                        : ""
                    }`}
                    key={apiKey.id}
                    onClick={() => onSelect(apiKey.id)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        onSelect(apiKey.id);
                      }
                    }}
                    role="button"
                    tabIndex={0}
                  >
                    <p className="min-w-0 truncate font-black text-white" title={apiKey.name}>
                      {apiKey.name}
                    </p>
                    <div className="min-w-0">
                      <p className="truncate text-slate-400" title={apiKey.project.name}>
                        {apiKey.project.name}
                      </p>
                      {apiKey.project.status === "INACTIVE" ? (
                        <p className="mt-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-300/90">
                          Ingestion paused
                        </p>
                      ) : null}
                    </div>
                    <p className="flex min-w-0 items-center gap-2 font-mono text-xs text-slate-300">
                      <span className="truncate" title={apiKey.maskedKey}>
                        {apiKey.maskedKey}
                      </span>
                      <Icon name="document" className="size-4 shrink-0 text-slate-500" />
                    </p>
                    <p className="min-w-0 truncate text-slate-300" title={apiKey.permissions}>
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
                    <p className="truncate text-slate-400">{formatLastUsed(apiKey.lastUsedAt)}</p>
                    <p className="truncate text-slate-400">{formatDate(apiKey.createdAt)}</p>
                    <div className="flex justify-end">
                      <KeyActions apiKey={apiKey} isRevoking={isRevoking} onRevoke={onRevoke} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}

      <div className="flex flex-col gap-3 border-t border-slate-800/80 px-4 py-4 text-sm text-slate-400 sm:flex-row sm:items-center sm:justify-between">
        <span>
          Showing {apiKeys.length === 0 ? "0" : `1 to ${apiKeys.length}`} of{" "}
          {apiKeys.length} results
        </span>
        <div className="flex items-center gap-2">
          <button
            aria-label="Previous page"
            className="cursor-not-allowed rounded-lg border border-slate-700/80 px-3 py-2 text-slate-600 opacity-60"
            disabled
            type="button"
          >
            ‹
          </button>
          <span
            aria-current="page"
            className="rounded-lg border border-blue-400/40 bg-blue-600/25 px-3 py-2 font-bold text-cyan-300"
          >
            1
          </span>
          <button
            aria-label="Next page"
            className="cursor-not-allowed rounded-lg border border-slate-700/80 px-3 py-2 text-slate-600 opacity-60"
            disabled
            type="button"
          >
            ›
          </button>
        </div>
      </div>
    </section>
  );
}
