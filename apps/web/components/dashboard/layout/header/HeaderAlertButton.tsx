"use client";

import { Icon } from "@/components/common/Icon";
import type {
  AlertTrigger,
  AlertTriggersResponse,
} from "@/components/dashboard/alerts/alert-types";
import { useOutsideClick } from "@/hooks/useOutsideClick";
import { apiRequest, getAuthHeaders } from "@/lib/api";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

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

type LoadState = "idle" | "loading" | "loaded" | "error";

export function HeaderAlertButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [loadState, setLoadState] = useState<LoadState>("idle");
  const [triggers, setTriggers] = useState<AlertTrigger[]>([]);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useOutsideClick(wrapperRef, () => setIsOpen(false), isOpen);

  // Fetch real triggers the first time the panel is opened.
  useEffect(() => {
    if (!isOpen || loadState !== "loading") {
      return;
    }

    apiRequest<AlertTriggersResponse>("/api/alerts/triggers", {
      headers: getAuthHeaders(),
    })
      .then((res) => {
        setTriggers(res.data.triggers);
        setLoadState("loaded");
      })
      .catch(() => {
        setLoadState("error");
      });
  }, [isOpen, loadState]);

  function togglePanel() {
    const willOpen = !isOpen;
    setIsOpen(willOpen);
    if (willOpen && loadState === "idle") {
      setLoadState("loading");
    }
  }

  return (
    <div className="relative" ref={wrapperRef}>
      <button
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        aria-label="Notifications"
        className="relative flex size-12 items-center justify-center rounded-xl border border-slate-700/80 bg-slate-950/60 text-slate-200"
        onClick={togglePanel}
        type="button"
      >
        <Icon name="bell" className="size-5" />
      </button>

      {isOpen ? (
        <div className="absolute right-0 top-full z-50 mt-3 w-80 overflow-hidden rounded-2xl border border-blue-500/55 bg-[#071426]/95 shadow-[0_24px_70px_rgba(0,0,0,0.42),0_0_28px_rgba(14,165,233,0.14)] backdrop-blur-xl">
          <div className="flex items-center justify-between border-b border-slate-800/80 px-5 py-4">
            <p className="text-sm font-black text-white">Notifications</p>
          </div>

          {loadState === "loading" ? (
            <div className="flex items-center justify-center px-6 py-9">
              <div className="size-5 animate-spin rounded-full border-2 border-slate-700 border-t-cyan-400" />
            </div>
          ) : triggers.length > 0 ? (
            <div className="max-h-72 overflow-y-auto">
              {triggers.map((trigger) => (
                <div
                  className="border-t border-slate-800/70 px-5 py-3 first:border-t-0"
                  key={trigger.id}
                >
                  <p className="truncate text-sm font-bold text-white">
                    {trigger.alert.name}
                  </p>
                  <p className="mt-0.5 truncate text-xs text-slate-400">
                    {trigger.alert.eventName} reached {trigger.eventCount}/
                    {trigger.threshold} · {trigger.alert.project.name}
                  </p>
                  <p className="mt-0.5 text-[11px] text-slate-500">
                    {timeAgo(trigger.createdAt)}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center gap-3 px-6 py-9 text-center">
              <div className="flex size-11 items-center justify-center rounded-full border border-slate-800/60 bg-slate-900/60 text-slate-600">
                <Icon name="bell" className="size-5" />
              </div>
              <p className="text-sm font-bold text-slate-300">
                No triggered alerts yet.
              </p>
              <p className="max-w-[220px] text-xs leading-relaxed text-slate-500">
                Create alerts to monitor event spikes. Triggered alerts will
                show up here.
              </p>
            </div>
          )}

          <div className="border-t border-slate-800/80 px-2 py-2">
            <Link
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold text-slate-300 transition hover:bg-white/5 hover:text-white"
              href="/dashboard/alerts"
              onClick={() => setIsOpen(false)}
            >
              <span className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-slate-700/70 bg-slate-950/50 text-cyan-400">
                <Icon name="bell" className="size-4" />
              </span>
              Manage alerts
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}
