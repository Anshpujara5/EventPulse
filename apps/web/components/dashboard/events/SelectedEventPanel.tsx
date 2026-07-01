import { GlowCard } from "@/components/common/GlowCard";
import { Icon } from "@/components/common/Icon";
import { useState } from "react";
import type { EventRecord } from "./event-types";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function SelectedEventPanel({ event }: { event: EventRecord | null }) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    if (!event) return;
    const payload = JSON.stringify(event.properties, null, 2);
    void navigator.clipboard.writeText(payload).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  if (!event) {
    return (
      <GlowCard className="flex flex-col items-center justify-center gap-3 p-8 text-center">
        <div className="flex size-12 items-center justify-center rounded-2xl border border-slate-700 bg-slate-800 text-slate-500">
          <Icon className="size-6" name="activity" />
        </div>
        <p className="font-bold text-slate-400">Select an event to inspect</p>
        <p className="text-xs text-slate-600">
          Click any row in the event stream to view details and payload.
        </p>
      </GlowCard>
    );
  }

  const details: [string, string][] = [
    ["Event ID", event.id],
    ["Event Name", event.name],
    ["Project", event.projectName ?? event.projectId],
    ["Domain", event.projectDomain ?? "—"],
    ["API Key", event.apiKeyName ?? "—"],
    ["Key Prefix", event.keyPrefix ?? "—"],
    ["Received", formatDate(event.createdAt)],
  ];

  const propertiesJson = JSON.stringify(event.properties, null, 2);
  const hasProperties = Object.keys(event.properties).length > 0;

  return (
    <GlowCard className="p-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-black text-white">Event Details</h2>
          <p className="mt-1 text-xs text-slate-500">
            {event.name}
          </p>
        </div>
        <button
          className="rounded-lg border border-slate-700/80 bg-slate-950/50 px-3 py-2 text-xs font-black text-cyan-300 transition hover:border-cyan-300/35 disabled:opacity-50"
          disabled={!hasProperties}
          onClick={handleCopy}
          type="button"
        >
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>

      <div className="mt-5 grid gap-2">
        {details.map(([label, value]) => (
          <div
            className="flex items-start justify-between gap-4 text-sm"
            key={label}
          >
            <span className="shrink-0 text-slate-500">{label}</span>
            <span className="truncate text-right font-bold text-slate-200">
              {value}
            </span>
          </div>
        ))}
      </div>

      <div className="mt-5">
        <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">
          Properties
        </p>
        {hasProperties ? (
          <pre className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/80 p-4 font-mono text-xs leading-relaxed text-cyan-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
            {propertiesJson}
          </pre>
        ) : (
          <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-4 text-xs text-slate-600">
            No properties on this event.
          </div>
        )}
      </div>
    </GlowCard>
  );
}
