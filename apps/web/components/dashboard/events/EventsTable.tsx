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
  matching: number;
  selected: EventRecord | null;
  onSelect: (e: EventRecord) => void;
}

export function EventsTable({ events, matching, selected, onSelect }: Props) {
  const scopeLabel =
    matching > events.length
      ? `Showing ${events.length.toLocaleString()} of ${matching.toLocaleString()} matching events — newest first.`
      : `Showing all ${events.length.toLocaleString()} matching event${events.length !== 1 ? "s" : ""} — newest first.`;

  return (
    <section className="max-w-full overflow-hidden rounded-2xl border border-slate-700/70 bg-[#071426]/85 shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_18px_50px_rgba(0,0,0,0.18)]">
      <div className="flex flex-col gap-2 border-b border-slate-800/80 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-black text-white">Event Stream</h2>
          <p className="mt-1 text-xs text-slate-500">{scopeLabel}</p>
        </div>
      </div>

      {/* Each row is a flex-wrap layout — it naturally reflows at any width
          instead of switching between a fixed table and a stacked card at a
          specific viewport breakpoint. */}
      {events.map((event) => {
        const isSelected = selected?.id === event.id;
        const hasProperties = Object.keys(event.properties).length > 0;
        return (
          <button
            className={`flex w-full flex-wrap items-center gap-x-6 gap-y-2 border-t border-slate-800/80 px-5 py-4 text-left text-sm transition first:border-t-0 hover:bg-white/[0.025] ${
              isSelected ? "bg-cyan-500/5 border-l-2 border-l-cyan-400" : ""
            }`}
            key={event.id}
            onClick={() => onSelect(event)}
            type="button"
          >
            {/* Left: event name, project, API key */}
            <div className="flex min-w-0 flex-1 basis-[240px] items-center gap-3">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-full border border-cyan-400/25 bg-cyan-500/10 text-cyan-300">
                <Icon className="size-4" name="activity" />
              </div>
              <div className="min-w-0">
                <p className="truncate font-black text-white">{event.name}</p>
                <p className="mt-0.5 truncate text-xs text-slate-500">
                  {event.projectName ?? event.projectId} ·{" "}
                  <span className="font-mono">
                    {event.keyPrefix ?? event.apiKeyId.slice(0, 12)}…
                  </span>
                </p>
              </div>
            </div>

            {/* Middle: properties preview */}
            <p className="min-w-0 flex-1 basis-[160px] truncate text-xs text-slate-500">
              {hasProperties ? JSON.stringify(event.properties) : "No properties"}
            </p>

            {/* Far right: time + details indicator */}
            <div className="flex shrink-0 items-center gap-3">
              <span className="text-xs text-slate-500">{timeAgo(event.createdAt)}</span>
              <span className="flex size-7 items-center justify-center rounded-lg text-slate-500 hover:bg-white/5 hover:text-cyan-300">
                ⋮
              </span>
            </div>
          </button>
        );
      })}

      <div className="flex items-center justify-between border-t border-slate-800/80 px-5 py-3 text-xs text-slate-500">
        <span>
          {events.length.toLocaleString()} of {matching.toLocaleString()}{" "}
          matching event{matching !== 1 ? "s" : ""} loaded
        </span>
      </div>
    </section>
  );
}
