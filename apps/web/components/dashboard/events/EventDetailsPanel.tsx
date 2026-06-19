import { GlowCard } from "@/components/common/GlowCard";
import { selectedEventDetails, selectedEventPayload } from "./events-data";

export function EventDetailsPanel() {
  return (
    <GlowCard className="p-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-black text-white">Event Details</h2>
          <p className="mt-1 text-xs text-slate-500">Selected event preview.</p>
        </div>
        <button
          className="rounded-lg border border-slate-700/80 bg-slate-950/50 px-3 py-2 text-xs font-black text-cyan-300 transition hover:border-cyan-300/35"
          type="button"
        >
          Copy
        </button>
      </div>

      <div className="mt-5 grid gap-3">
        {selectedEventDetails.map(([label, value]) => (
          <div className="flex items-center justify-between gap-4 text-sm" key={label}>
            <span className="text-slate-500">{label}</span>
            <span className="truncate font-bold text-slate-200">{value}</span>
          </div>
        ))}
      </div>

      <pre className="mt-5 overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/80 p-4 font-mono text-xs leading-relaxed text-cyan-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
        {selectedEventPayload}
      </pre>
    </GlowCard>
  );
}
