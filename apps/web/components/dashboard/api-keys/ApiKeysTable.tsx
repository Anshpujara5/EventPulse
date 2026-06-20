import { Icon } from "@/components/common/Icon";
import { apiKeys } from "./api-keys-data";

function statusClassName(status: string) {
  if (status === "Revoked") {
    return "border-rose-400/20 bg-rose-500/10 text-rose-300";
  }

  if (status === "Inactive") {
    return "border-slate-500/30 bg-slate-700/20 text-slate-300";
  }

  return "border-emerald-400/20 bg-emerald-500/10 text-emerald-300";
}

function statusDotClassName(status: string) {
  if (status === "Revoked") {
    return "bg-rose-400";
  }

  if (status === "Inactive") {
    return "bg-slate-500";
  }

  return "bg-emerald-400";
}

export function ApiKeysTable() {
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-700/70 bg-[#071426]/85 shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_18px_50px_rgba(0,0,0,0.18)]">
      <div className="hidden grid-cols-[1.15fr_1.05fr_1.3fr_0.95fr_0.75fr_0.8fr_0.9fr_0.8fr_1fr] px-4 py-4 text-xs font-bold uppercase tracking-wide text-slate-500 xl:grid">
        <span>Key Name</span>
        <span>Project</span>
        <span>Key Prefix / Masked Key</span>
        <span>Permissions</span>
        <span>Status</span>
        <span>Last Used</span>
        <span>Created</span>
        <span>Requests</span>
        <span className="text-right">Actions</span>
      </div>

      {apiKeys.map((apiKey, index) => (
        <div
          className={`grid gap-3 border-t border-slate-800/80 px-4 py-4 text-sm first:border-t-0 xl:grid-cols-[1.15fr_1.05fr_1.3fr_0.95fr_0.75fr_0.8fr_0.9fr_0.8fr_1fr] xl:items-center ${
            index === 0 ? "bg-blue-500/8 ring-1 ring-inset ring-blue-400/45" : ""
          }`}
          key={apiKey.name}
        >
          <p className="font-black text-white">{apiKey.name}</p>
          <p className="text-slate-400">{apiKey.project}</p>
          <p className="flex items-center gap-2 font-mono text-xs text-slate-300">
            {apiKey.key}
            <Icon name="document" className="size-4 text-slate-500" />
          </p>
          <p className="text-slate-300">{apiKey.permissions}</p>
          <div>
            <span
              className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-black ${statusClassName(apiKey.status)}`}
            >
              <span className={`size-2 rounded-full ${statusDotClassName(apiKey.status)}`} />
              {apiKey.status}
            </span>
          </div>
          <p className="text-slate-400">{apiKey.lastUsed}</p>
          <p className="text-slate-400">{apiKey.created}</p>
          <p className="font-bold text-white">{apiKey.requestsToday}</p>
          <div className="flex flex-wrap items-center gap-2 xl:justify-end">
            {["View", "Copy"].map((action) => (
              <button
                className="rounded-lg border border-slate-700/80 bg-slate-950/35 px-3 py-2 text-xs font-bold text-slate-300 transition hover:border-cyan-300/35 hover:text-cyan-300"
                key={action}
                type="button"
              >
                {action}
              </button>
            ))}
            <button
              className="flex size-8 items-center justify-center rounded-lg text-slate-500 transition hover:bg-white/5 hover:text-cyan-300"
              type="button"
            >
              ⋮
            </button>
          </div>
        </div>
      ))}

      <div className="flex flex-col gap-3 border-t border-slate-800/80 px-4 py-4 text-sm text-slate-400 sm:flex-row sm:items-center sm:justify-between">
        <span>Showing 1 to 5 of 5 results</span>
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
