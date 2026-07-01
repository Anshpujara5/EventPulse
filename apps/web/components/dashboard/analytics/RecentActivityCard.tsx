import { GlowCard } from "@/components/common/GlowCard";
import { Icon } from "@/components/common/Icon";
import type { RecentEvent } from "./analytics-types";

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const secs = Math.floor(diff / 1000);
  if (secs < 60) return `${secs}s ago`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export function RecentActivityCard({ events }: { events: RecentEvent[] }) {
  return (
    <GlowCard className="overflow-hidden">
      <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
        <h2 className="text-lg font-black text-white">Recent Activity</h2>
        <a
          className="text-sm font-bold text-cyan-300 hover:text-cyan-200"
          href="/dashboard/events"
        >
          View all →
        </a>
      </div>

      {events.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 px-5 py-10 text-center">
          <Icon className="size-8 text-slate-600" name="pulse" />
          <p className="text-sm text-slate-500">No recent activity.</p>
        </div>
      ) : (
        <div className="divide-y divide-slate-800/60">
          {events.map((event) => (
            <div
              className="flex items-center gap-3 px-5 py-3"
              key={event.id}
            >
              <div className="flex size-8 shrink-0 items-center justify-center rounded-full border border-cyan-400/20 bg-cyan-500/10 text-cyan-400">
                <Icon className="size-3.5" name="activity" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-bold text-white text-sm">
                  {event.name}
                </p>
                <p className="truncate text-xs text-slate-500">
                  {event.projectName}
                </p>
              </div>
              <span className="shrink-0 text-xs text-slate-500">
                {timeAgo(event.createdAt)}
              </span>
            </div>
          ))}
        </div>
      )}
    </GlowCard>
  );
}
