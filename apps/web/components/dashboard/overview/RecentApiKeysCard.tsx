import { GlowCard } from "@/components/common/GlowCard";
import { Icon } from "@/components/common/Icon";
import type { DashboardApiKey } from "./dashboard-types";

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export function RecentApiKeysCard({ apiKeys }: { apiKeys: DashboardApiKey[] }) {
  return (
    <GlowCard className="overflow-hidden">
      <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
        <h2 className="text-lg font-black">Recent API Keys</h2>
        <a
          className="text-sm font-bold text-cyan-300 hover:text-cyan-200"
          href="/dashboard/api-keys"
        >
          View all →
        </a>
      </div>

      {apiKeys.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 px-5 py-10 text-center">
          <Icon className="size-8 text-slate-600" name="key" />
          <p className="text-sm text-slate-500">No API keys yet.</p>
          <a
            className="mt-1 text-sm font-bold text-cyan-400 hover:text-cyan-300"
            href="/dashboard/api-keys"
          >
            Create your first API key →
          </a>
        </div>
      ) : (
        <div className="divide-y divide-slate-800">
          {apiKeys.map((key) => (
            <div
              className="flex items-center justify-between px-5 py-4"
              key={key.id}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-slate-700 bg-slate-800 text-blue-400">
                  <Icon className="size-4" name="key" />
                </div>
                <div className="min-w-0">
                  <p className="truncate font-bold text-white">{key.name}</p>
                  <p className="truncate text-xs text-slate-500">
                    {key.maskedKey} · {key.project.name}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0 ml-3">
                <span
                  className={`rounded-md px-2 py-1 text-xs font-black ${
                    key.status === "ACTIVE"
                      ? "bg-emerald-500/10 text-emerald-300"
                      : "bg-rose-500/10 text-rose-300"
                  }`}
                >
                  {key.status === "ACTIVE" ? "Active" : "Revoked"}
                </span>
                <span className="text-xs text-slate-500 whitespace-nowrap">
                  {timeAgo(key.createdAt)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </GlowCard>
  );
}
