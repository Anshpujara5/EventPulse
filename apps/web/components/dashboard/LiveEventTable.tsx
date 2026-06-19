import { Icon } from "@/components/common/Icon";
import { liveEvents } from "./events-data";

function statusClassName(status: string) {
  if (status === "Failed") {
    return "border-rose-400/20 bg-rose-500/10 text-rose-300";
  }

  if (status === "Warning" || status === "Delayed") {
    return "border-amber-400/20 bg-amber-500/10 text-amber-300";
  }

  return "border-emerald-400/20 bg-emerald-500/10 text-emerald-300";
}

function statusDotClassName(status: string) {
  if (status === "Failed") {
    return "bg-rose-400";
  }

  if (status === "Warning" || status === "Delayed") {
    return "bg-amber-400";
  }

  return "bg-emerald-400";
}

export function LiveEventTable() {
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-700/70 bg-[#071426]/85 shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_18px_50px_rgba(0,0,0,0.18)]">
      <div className="flex flex-col gap-2 border-b border-slate-800/80 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-black text-white">Live Event Stream</h2>
          <p className="mt-1 text-xs text-slate-500">
            Incoming activity from SDKs, APIs, and dashboard actions.
          </p>
        </div>
        <span className="inline-flex w-fit items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-1 text-xs font-black text-emerald-300">
          <span className="size-2 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.85)]" />
          Live
        </span>
      </div>

      <div className="hidden grid-cols-[1.25fr_1.15fr_0.95fr_0.75fr_0.85fr_0.8fr_0.75fr_0.35fr] px-5 py-3 text-xs font-bold uppercase tracking-wide text-slate-500 xl:grid">
        <span>Event Name</span>
        <span>Project</span>
        <span>User ID</span>
        <span>Status</span>
        <span>Timestamp</span>
        <span>Source</span>
        <span>Payload</span>
        <span />
      </div>

      {liveEvents.map((event) => (
        <div
          className="grid gap-3 border-t border-slate-800/80 px-5 py-4 text-sm first:border-t-0 xl:grid-cols-[1.25fr_1.15fr_0.95fr_0.75fr_0.85fr_0.8fr_0.75fr_0.35fr] xl:items-center"
          key={`${event.name}-${event.timestamp}`}
        >
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-full border border-cyan-400/25 bg-cyan-500/10 text-cyan-300">
              <Icon name={event.status === "Failed" ? "bell" : "activity"} className="size-5" />
            </div>
            <p className="truncate font-black text-white">{event.name}</p>
          </div>
          <p className="truncate text-slate-400">{event.project}</p>
          <p className="font-mono text-xs text-slate-300">{event.userId}</p>
          <div>
            <span
              className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-black ${statusClassName(event.status)}`}
            >
              <span className={`size-2 rounded-full ${statusDotClassName(event.status)}`} />
              {event.status}
            </span>
          </div>
          <p className="text-slate-400">{event.timestamp}</p>
          <p className="text-slate-300">{event.source}</p>
          <p className="font-bold text-white">{event.payloadSize}</p>
          <button
            className="flex size-8 items-center justify-center rounded-lg text-slate-500 transition hover:bg-white/5 hover:text-cyan-300"
            type="button"
          >
            ⋮
          </button>
        </div>
      ))}

      <div className="flex flex-col gap-3 border-t border-slate-800/80 px-5 py-4 text-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-4 text-slate-400">
          <span className="inline-flex items-center gap-2 font-bold text-emerald-300">
            <span className="size-2 rounded-full bg-emerald-400" />
            Streaming live
          </span>
          <span>Showing latest 50 events</span>
        </div>
        <a className="font-black text-cyan-400 hover:text-cyan-300" href="#">
          View all events →
        </a>
      </div>
    </section>
  );
}
