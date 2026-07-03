"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@/components/common/Icon";
import type { EventRecord } from "./event-types";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function EventDetailsDrawer({
  event,
  onClose,
}: {
  event: EventRecord | null;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState<"id" | "properties" | null>(null);

  useEffect(() => {
    if (!event) {
      return;
    }

    function handleKeyDown(keyEvent: KeyboardEvent) {
      if (keyEvent.key === "Escape") {
        onClose();
      }
    }

    document.addEventListener("keydown", handleKeyDown);

    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [event, onClose]);

  if (!event || typeof document === "undefined") {
    return null;
  }

  function copy(kind: "id" | "properties", text: string) {
    void navigator.clipboard.writeText(text).then(() => {
      setCopied(kind);
      setTimeout(() => setCopied(null), 1500);
    });
  }

  const details: [string, string][] = [
    ["Event Name", event.name],
    ["Project", event.projectName ?? event.projectId],
    ["Domain", event.projectDomain ?? "—"],
    ["API Key", event.apiKeyName ?? "—"],
    ["Key Prefix", event.keyPrefix ?? "—"],
    ["Received", formatDate(event.createdAt)],
  ];

  const propertiesJson = JSON.stringify(event.properties, null, 2);
  const hasProperties = Object.keys(event.properties).length > 0;

  return createPortal(
    <div
      aria-labelledby="event-details-title"
      aria-modal="true"
      className="fixed inset-0 z-[100] flex justify-end bg-slate-950/70 backdrop-blur-sm"
      onMouseDown={(mouseEvent) => {
        if (mouseEvent.target === mouseEvent.currentTarget) {
          onClose();
        }
      }}
      role="dialog"
    >
      <aside className="flex h-full w-full max-w-md flex-col overflow-y-auto border-l border-blue-500/40 bg-[#071426]/98 shadow-[0_0_60px_rgba(0,0,0,0.55)]">
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-slate-800/80 bg-[#071426]/98 px-5 py-4 backdrop-blur-xl">
          <div className="min-w-0">
            <h2 className="text-lg font-black text-white" id="event-details-title">
              Event Details
            </h2>
            <p className="mt-1 truncate text-xs text-slate-500">{event.name}</p>
          </div>
          <button
            aria-label="Close event details"
            className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-slate-700/80 bg-slate-950/50 text-slate-400 transition hover:text-white"
            onClick={onClose}
            type="button"
          >
            ×
          </button>
        </div>

        <div className="px-5 py-5">
          <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-950/70 px-4 py-3">
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
                Event ID
              </p>
              <p
                className="mt-1 truncate font-mono text-xs text-cyan-100"
                title={event.id}
              >
                {event.id}
              </p>
            </div>
            <button
              className="shrink-0 rounded-lg border border-slate-700/80 bg-slate-950/50 px-3 py-2 text-xs font-black text-cyan-300 transition hover:border-cyan-300/35"
              onClick={() => copy("id", event.id)}
              type="button"
            >
              {copied === "id" ? "Copied!" : "Copy"}
            </button>
          </div>

          <div className="mt-5 grid gap-2">
            {details.map(([label, value]) => (
              <div
                className="flex items-start justify-between gap-4 text-sm"
                key={label}
              >
                <span className="shrink-0 text-slate-500">{label}</span>
                <span
                  className="min-w-0 truncate text-right font-bold text-slate-200"
                  title={value}
                >
                  {value}
                </span>
              </div>
            ))}
          </div>

          <div className="mt-5">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                Properties
              </p>
              <button
                className="rounded-lg border border-slate-700/80 bg-slate-950/50 px-3 py-1.5 text-xs font-black text-cyan-300 transition hover:border-cyan-300/35 disabled:opacity-50"
                disabled={!hasProperties}
                onClick={() => copy("properties", propertiesJson)}
                type="button"
              >
                {copied === "properties" ? "Copied!" : "Copy JSON"}
              </button>
            </div>
            {hasProperties ? (
              <pre className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/80 p-4 font-mono text-xs leading-relaxed text-cyan-100">
                {propertiesJson}
              </pre>
            ) : (
              <div className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-950/80 p-4 text-xs text-slate-600">
                <Icon name="activity" className="size-4" />
                No properties on this event.
              </div>
            )}
          </div>
        </div>
      </aside>
    </div>,
    document.body,
  );
}
