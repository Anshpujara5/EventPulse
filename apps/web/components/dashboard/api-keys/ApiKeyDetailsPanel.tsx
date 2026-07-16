"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import type { ApiKey } from "./api-key-types";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

export function ApiKeyDetailsPanel({
  apiKey,
  isRevoking,
  onClose,
  onRevoke,
  rawApiKey,
}: {
  apiKey?: ApiKey;
  isRevoking?: boolean;
  onClose: () => void;
  onRevoke: (id: string) => void;
  rawApiKey?: string;
}) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!apiKey) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    document.addEventListener("keydown", handleKeyDown);

    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [apiKey, onClose]);

  if (!apiKey || typeof document === "undefined") {
    return null;
  }

  const currentApiKey = apiKey;

  function copyKeyOrPrefix() {
    const text = rawApiKey ?? currentApiKey.keyPrefix;
    void navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  const detailRows: [string, string][] = [
    ["Name", apiKey.name],
    ["Project", apiKey.project.name],
    ["Status", apiKey.status === "ACTIVE" ? "Active" : "Revoked"],
    [
      "Last Used",
      apiKey.lastUsedAt ? formatDate(apiKey.lastUsedAt) : "Never used",
    ],
    ...(apiKey.project.status === "INACTIVE"
      ? ([["Ingestion", "Paused (project archived)"]] as [string, string][])
      : []),
    ["Permissions", apiKey.permissions],
    ["Key Prefix", apiKey.keyPrefix],
    ["Created", formatDate(apiKey.createdAt)],
  ];

  return createPortal(
    <div
      aria-labelledby="api-key-details-title"
      aria-modal="true"
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/75 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
      role="dialog"
    >
      <div className="flex min-h-full items-center justify-center px-4 py-8">
        <div className="flex max-h-[calc(100vh-4rem)] w-full max-w-xl flex-col rounded-2xl border border-slate-700/80 bg-[#071426]/98 shadow-[0_24px_70px_rgba(0,0,0,0.5)]">
          {/* Header stays pinned so it's never cut off by scroll. */}
          <div className="flex shrink-0 items-start justify-between gap-4 border-b border-slate-800/70 p-6 pb-5">
            <div className="min-w-0">
              <h2 className="text-xl font-black text-white" id="api-key-details-title">
                API Key Details
              </h2>
              <p className="mt-1 truncate text-sm text-slate-400">{apiKey.name}</p>
            </div>
            <button
              aria-label="Close API key details"
              className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-slate-700/80 bg-slate-950/50 text-slate-400 transition hover:text-white"
              onClick={onClose}
              type="button"
            >
              ×
            </button>
          </div>

          {/* Body scrolls internally on short viewports; header doesn't. */}
          <div className="min-h-0 flex-1 overflow-y-auto p-6">
            <div className="grid gap-3">
              {detailRows.map(([label, value]) => (
                <div className="flex items-center justify-between gap-4 text-sm" key={label}>
                  <span className="shrink-0 text-slate-500">{label}</span>
                  <span className="min-w-0 truncate text-right font-bold text-slate-200" title={value}>
                    {value}
                  </span>
                </div>
              ))}
            </div>

            {rawApiKey ? (
              <p className="mt-5 rounded-xl border border-cyan-400/25 bg-cyan-500/10 px-4 py-3 text-xs font-bold text-cyan-100">
                Full key is visible one time. Copy it before leaving this page.
              </p>
            ) : (
              <div className="mt-5 rounded-xl border border-slate-700/70 bg-slate-950/50 px-4 py-3 text-xs text-slate-400">
                <p className="font-bold text-slate-300">
                  Full key is only shown once at creation.
                </p>
                <p className="mt-1">Create a new key if you lost the secret.</p>
              </div>
            )}

            <div className="mt-5 flex items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-950/80 px-4 py-3">
              <p
                className="min-w-0 truncate font-mono text-xs text-cyan-100"
                title={`Authorization: Bearer ${rawApiKey ?? apiKey.maskedKey}`}
              >
                Authorization: Bearer {rawApiKey ?? apiKey.maskedKey}
              </p>
              <button
                className="shrink-0 rounded-lg border border-slate-700/80 bg-slate-950/50 px-3 py-2 text-xs font-black text-cyan-300 transition hover:border-cyan-300/35"
                onClick={copyKeyOrPrefix}
                title={rawApiKey ? "Copy the full key" : "Copy the non-secret key prefix"}
                type="button"
              >
                {copied ? "Copied!" : rawApiKey ? "Copy key" : "Copy prefix"}
              </button>
            </div>
          </div>

          {/* Footer stays pinned so Revoke is always reachable. */}
          <div className="shrink-0 border-t border-slate-800/70 p-6 pt-5">
            <button
              className="w-full rounded-lg border border-rose-400/25 bg-rose-500/10 px-3 py-2 text-xs font-black text-rose-300 transition hover:bg-rose-500/15 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={apiKey.status === "REVOKED" || !!isRevoking}
              onClick={() => onRevoke(apiKey.id)}
              type="button"
            >
              Revoke
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
