import { ApiKeyDetailsPanel } from "./ApiKeyDetailsPanel";
import { ApiKeyMetricCard } from "./ApiKeyMetricCard";
import { ApiKeysFilterBar } from "./ApiKeysFilterBar";
import { ApiKeysTable } from "./ApiKeysTable";
import { apiKeyMetrics } from "./api-keys-data";
import { SecurityBestPracticesCard } from "./SecurityBestPracticesCard";

export function ApiKeysOverview() {
  return (
    <div className="mx-auto max-w-[1420px] px-4 py-5 sm:px-6">
      <div>
        <h1 className="text-3xl font-black tracking-tight">API Keys</h1>
        <p className="mt-1 text-sm text-slate-400">
          Create and manage secure keys for sending events to EventPulse.
        </p>
      </div>

      <ApiKeysFilterBar />

      <section className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {apiKeyMetrics.map((metric) => (
          <ApiKeyMetricCard key={metric.label} metric={metric} />
        ))}
      </section>

      <section className="mt-4 grid gap-4 xl:grid-cols-[1fr_340px]">
        <div className="grid gap-4">
          <ApiKeysTable />
          <section className="rounded-2xl border border-dashed border-slate-700/80 bg-slate-950/35 p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                <div className="flex size-14 items-center justify-center rounded-full border border-blue-400/40 bg-blue-500/10 text-3xl font-light text-cyan-300">
                  +
                </div>
                <div>
                  <h2 className="text-xl font-black text-white">Create API Key</h2>
                  <p className="mt-1 text-sm text-slate-400">
                    Generate a new API key to start sending events to EventPulse.
                  </p>
                </div>
              </div>
              <button
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-linear-to-r from-blue-600 to-violet-600 px-5 text-sm font-black text-white shadow-[0_0_24px_rgba(79,70,229,0.25)]"
                type="button"
              >
                <span className="text-xl leading-none">+</span>
                Create new key
              </button>
            </div>
          </section>
        </div>

        <aside className="grid gap-4">
          <SecurityBestPracticesCard />
          <ApiKeyDetailsPanel />
        </aside>
      </section>
    </div>
  );
}
