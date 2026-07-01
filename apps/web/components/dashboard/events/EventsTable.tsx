import { Icon } from "@/components/common/Icon";
import type { EventRecord } from "./event-types";

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const secs = Math.floor(diff / 1000);
  if (secs < 60) return `${secs}s ago`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

interface Props {
  events: EventRecord[];
  selected: EventRecord | null;
  onSelect: (e: EventRecord) => void;
}

export function EventsTable({ events, selected, onSelect }: Props) {
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-700/70 bg-[#071426]/85 shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_18px_50px_rgba(0,0,0,0.18)]">
      <div className="flex flex-col gap-2 border-b border-slate-800/80 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-black text-white">Event Stream</h2>
          <p className="mt-1 text-xs text-slate-500">
            Showing the latest {events.length} event{events.length !== 1 ? "s" : ""} — newest first.
          </p>
        </div>
      </div>

      {/* Column headers */}
      <div className="hidden grid-cols-[1.4fr_1.1fr_0.9fr_0.7fr_0.4fr] px-5 py-3 text-xs font-bold uppercase tracking-wide text-slate-500 xl:grid">
        <span>Event Name</span>
        <span>Project</span>
        <span>API Key</span>
        <span>Time</span>
        <span />
      </div>

      {events.map((event) => {
        const isSelected = selected?.id === event.id;
        return (
          <button
            className={`grid w-full gap-3 border-t border-slate-800/80 px-5 py-4 text-left text-sm transition first:border-t-0 hover:bg-white/[0.025] xl:grid-cols-[1.4fr_1.1fr_0.9fr_0.7fr_0.4fr] xl:items-center ${
              isSelected ? "bg-cyan-500/5 border-l-2 border-l-cyan-400" : ""
            }`}
            key={event.id}
            onClick={() => onSelect(event)}
            type="button"
          >
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-full border border-cyan-400/25 bg-cyan-500/10 text-cyan-300">
                <Icon className="size-4" name="activity" />
              </div>
              <p className="truncate font-black text-white">{event.name}</p>
            </div>

            <p className="truncate text-slate-400">
              {event.projectName ?? event.projectId}
            </p>

            <p className="truncate font-mono text-xs text-slate-400">
              {event.keyPrefix ?? event.apiKeyId.slice(0, 12)}…
            </p>

            <p className="text-slate-500">{timeAgo(event.createdAt)}</p>

            <div className="flex justify-end">
              <span className="flex size-7 items-center justify-center rounded-lg text-slate-500 hover:bg-white/5 hover:text-cyan-300">
                ⋮
              </span>
            </div>
          </button>
        );
      })}

      <div className="flex items-center justify-between border-t border-slate-800/80 px-5 py-3 text-xs text-slate-500">
        <span>{events.length} event{events.length !== 1 ? "s" : ""} loaded</span>
      </div>
    </section>
  );
}
