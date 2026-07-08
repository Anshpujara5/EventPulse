"use client";

import { GlowCard } from "@/components/common/GlowCard";
import { Icon } from "@/components/common/Icon";
import { useDashboardHeaderState } from "@/components/dashboard/layout/header/DashboardHeaderContext";
import { apiRequest } from "@/lib/api";
import { useEffect, useMemo, useState } from "react";
import { AlertFormModal } from "./AlertFormModal";
import type { Alert, AlertMutationResponse, AlertsResponse } from "./alert-types";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function authHeaders(): Record<string, string> {
  const token =
    typeof window !== "undefined"
      ? localStorage.getItem("eventpulse_token")
      : null;
  return { Authorization: `Bearer ${token ?? ""}` };
}

// The alert form modal is shown either for creating a new alert ("new") or
// editing an existing one (the Alert itself). null means the modal is closed.
type FormTarget = "new" | Alert | null;

export function AlertsOverview() {
  // Header search filters this page's alert list, matching the pattern used
  // on Projects/API Keys/Events.
  const { searchQuery } = useDashboardHeaderState();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const [formTarget, setFormTarget] = useState<FormTarget>(null);

  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Alert | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  async function loadAlerts() {
    try {
      setError("");
      setIsLoading(true);
      const res = await apiRequest<AlertsResponse>("/api/alerts", {
        headers: authHeaders(),
      });
      setAlerts(res.data.alerts);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to load alerts",
      );
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadAlerts();
  }, []);

  const filteredAlerts = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) {
      return alerts;
    }
    return alerts.filter((alert) =>
      [alert.name, alert.eventName, alert.project.name].some((value) =>
        value.toLowerCase().includes(query),
      ),
    );
  }, [alerts, searchQuery]);

  function handleSaved(saved: Alert) {
    setAlerts((current) => {
      const exists = current.some((item) => item.id === saved.id);
      return exists
        ? current.map((item) => (item.id === saved.id ? saved : item))
        : [saved, ...current];
    });
    setFormTarget(null);
  }

  async function toggleStatus(alert: Alert) {
    const nextStatus = alert.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    try {
      setTogglingId(alert.id);
      const res = await apiRequest<AlertMutationResponse>(
        `/api/alerts/${alert.id}`,
        {
          method: "PATCH",
          headers: authHeaders(),
          body: JSON.stringify({ status: nextStatus }),
        },
      );
      setAlerts((current) =>
        current.map((item) => (item.id === alert.id ? res.data.alert : item)),
      );
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to update alert",
      );
    } finally {
      setTogglingId(null);
    }
  }

  async function runDelete() {
    if (!deleteTarget) {
      return;
    }
    try {
      setIsDeleting(true);
      await apiRequest<{ success: boolean }>(
        `/api/alerts/${deleteTarget.id}`,
        { method: "DELETE", headers: authHeaders() },
      );
      setAlerts((current) =>
        current.filter((alert) => alert.id !== deleteTarget.id),
      );
      setDeleteTarget(null);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to delete alert",
      );
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <div className="mx-auto min-w-0 max-w-[1420px] px-4 py-5 sm:px-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight">Alerts</h1>
          <p className="mt-1 text-sm text-slate-400">
            Get notified when a commerce event — like payment_failed or
            item_out_of_stock — fires more than expected within a time window.
          </p>
        </div>
        <button
          className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-linear-to-r from-blue-600 to-violet-600 px-5 text-sm font-black text-white shadow-[0_0_24px_rgba(79,70,229,0.25)]"
          onClick={() => setFormTarget("new")}
          type="button"
        >
          <span className="text-xl leading-none">+</span>
          Create Alert
        </button>
      </div>

      {/* Honest evaluation-status note — alerts are evaluated in real time as
          matching events are ingested, not on a separate polling schedule. */}
      <div className="mt-4 flex items-start gap-3 rounded-2xl border border-cyan-400/20 bg-cyan-500/8 px-5 py-4">
        <Icon name="bolt" className="mt-0.5 size-5 shrink-0 text-cyan-300" />
        <p className="text-sm text-slate-300">
          <span className="font-black text-cyan-200">
            Alerts are evaluated in real time
          </span>{" "}
          as matching events are ingested. No email/Slack delivery yet —
          triggers are recorded and visible here and in the notifications bell.
        </p>
      </div>

      <GlowCard className="mt-4 max-w-full overflow-hidden">
        {isLoading ? (
          <div className="px-5 py-12 text-center text-sm font-bold text-slate-400">
            Loading alerts...
          </div>
        ) : error ? (
          <div className="px-5 py-12 text-center">
            <p className="text-sm font-bold text-rose-300">{error}</p>
            <button
              className="mt-4 rounded-xl border border-slate-700/80 bg-slate-950/35 px-4 py-2 text-sm font-bold text-slate-300 transition hover:border-cyan-300/35 hover:text-cyan-300"
              onClick={() => void loadAlerts()}
              type="button"
            >
              Try again
            </button>
          </div>
        ) : alerts.length === 0 ? (
          <div className="px-5 py-14 text-center">
            <div className="mx-auto flex size-11 items-center justify-center rounded-full border border-slate-800/70 bg-slate-900/60 text-slate-500">
              <Icon name="bell" className="size-5" />
            </div>
            <p className="mt-3 text-lg font-black text-white">No alerts yet</p>
            <p className="mt-1 text-sm text-slate-400">
              Create your first alert to catch commerce spikes like payment
              failures, out-of-stock items, or checkout drop-offs.
            </p>
            <button
              className="mt-5 inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-linear-to-r from-blue-600 to-violet-600 px-5 text-sm font-black text-white shadow-[0_0_24px_rgba(79,70,229,0.25)]"
              onClick={() => setFormTarget("new")}
              type="button"
            >
              <span className="text-xl leading-none">+</span>
              Create Alert
            </button>
          </div>
        ) : filteredAlerts.length === 0 ? (
          <div className="px-5 py-14 text-center">
            <p className="text-sm font-bold text-slate-300">
              No alerts matching &ldquo;{searchQuery.trim()}&rdquo;
            </p>
          </div>
        ) : (
          <>
            {/* Below 2xl: labeled stacked cards — avoids forcing an 8-column
                table into a laptop-width content area. */}
            <div className="2xl:hidden">
              {filteredAlerts.map((alert) => {
                const isActive = alert.status === "ACTIVE";
                return (
                  <div
                    className="border-t border-slate-800/80 px-5 py-4 text-sm first:border-t-0"
                    key={alert.id}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-black text-white" title={alert.name}>
                          {alert.name}
                        </p>
                        <p className="mt-0.5 truncate text-xs text-slate-400" title={alert.project.name}>
                          {alert.project.name}
                        </p>
                      </div>
                      <span
                        className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-black ${
                          isActive
                            ? "border-emerald-400/20 bg-emerald-500/10 text-emerald-300"
                            : "border-slate-500/25 bg-slate-700/20 text-slate-300"
                        }`}
                      >
                        <span
                          className={`size-1.5 rounded-full ${
                            isActive ? "bg-emerald-400" : "bg-slate-400"
                          }`}
                        />
                        {isActive ? "Active" : "Inactive"}
                      </span>
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2.5 text-xs sm:grid-cols-4">
                      <div className="min-w-0">
                        <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">
                          Event
                        </p>
                        <p className="mt-0.5 truncate font-mono text-cyan-100" title={alert.eventName}>
                          {alert.eventName}
                        </p>
                      </div>
                      <div className="min-w-0">
                        <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">
                          Threshold
                        </p>
                        <p className="mt-0.5 text-slate-300">
                          {alert.threshold} in {alert.windowMinutes}m
                        </p>
                      </div>
                      <div className="min-w-0">
                        <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">
                          Created
                        </p>
                        <p className="mt-0.5 truncate text-slate-300">
                          {formatDate(alert.createdAt)}
                        </p>
                      </div>
                      <div className="min-w-0">
                        <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">
                          Triggers
                        </p>
                        <p className="mt-0.5 truncate text-slate-300">
                          {alert.triggerCount > 0
                            ? `${alert.triggerCount}× · last ${formatDate(alert.lastTriggeredAt as string)}`
                            : "Not triggered yet"}
                        </p>
                      </div>
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-1.5">
                      <button
                        className="rounded-lg border border-slate-700/80 bg-slate-950/35 px-2.5 py-1.5 text-[11px] font-bold text-slate-300 transition hover:border-cyan-300/35 hover:text-cyan-300"
                        onClick={() => setFormTarget(alert)}
                        type="button"
                      >
                        Edit
                      </button>
                      <button
                        className="rounded-lg border border-slate-700/80 bg-slate-950/35 px-2.5 py-1.5 text-[11px] font-bold text-slate-300 transition hover:border-cyan-300/35 hover:text-cyan-300 disabled:cursor-not-allowed disabled:opacity-50"
                        disabled={togglingId === alert.id}
                        onClick={() => void toggleStatus(alert)}
                        type="button"
                      >
                        {isActive ? "Disable" : "Enable"}
                      </button>
                      <button
                        className="rounded-lg border border-rose-400/20 bg-rose-500/10 px-2.5 py-1.5 text-[11px] font-bold text-rose-300 transition hover:bg-rose-500/15"
                        onClick={() => setDeleteTarget(alert)}
                        type="button"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* 2xl and up: dense table, with an internal scroll safety net. */}
            <div className="hidden 2xl:block">
              <div className="overflow-x-auto">
                <div className="min-w-[960px]">
                  <div className="grid grid-cols-[1.2fr_0.9fr_1fr_0.55fr_0.6fr_0.8fr_0.8fr_1.05fr] px-5 py-4 text-xs font-bold uppercase tracking-wide text-slate-500">
                    <span>Name</span>
                    <span>Project</span>
                    <span>Event</span>
                    <span>Count</span>
                    <span>Window</span>
                    <span>Status</span>
                    <span>Created</span>
                    <span className="text-right">Actions</span>
                  </div>

                  {filteredAlerts.map((alert) => {
                    const isActive = alert.status === "ACTIVE";
                    return (
                      <div
                        className="grid grid-cols-[1.2fr_0.9fr_1fr_0.55fr_0.6fr_0.8fr_0.8fr_1.05fr] items-center gap-2 border-t border-slate-800/80 px-5 py-4 text-sm"
                        key={alert.id}
                      >
                        <div className="min-w-0">
                          <p
                            className="truncate font-black text-white"
                            title={alert.name}
                          >
                            {alert.name}
                          </p>
                          <p className="mt-0.5 truncate text-[11px] text-slate-500">
                            {alert.triggerCount > 0
                              ? `Triggered ${alert.triggerCount}× · last ${formatDate(alert.lastTriggeredAt as string)}`
                              : "Not triggered yet"}
                          </p>
                        </div>
                        <p
                          className="min-w-0 truncate text-slate-400"
                          title={alert.project.name}
                        >
                          {alert.project.name}
                        </p>
                        <p
                          className="min-w-0 truncate font-mono text-xs text-cyan-100"
                          title={alert.eventName}
                        >
                          {alert.eventName}
                        </p>
                        <p className="text-slate-300">{alert.threshold}</p>
                        <p className="text-slate-300">{alert.windowMinutes}m</p>
                        <div>
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-black ${
                              isActive
                                ? "border-emerald-400/20 bg-emerald-500/10 text-emerald-300"
                                : "border-slate-500/25 bg-slate-700/20 text-slate-300"
                            }`}
                          >
                            <span
                              className={`size-1.5 rounded-full ${
                                isActive ? "bg-emerald-400" : "bg-slate-400"
                              }`}
                            />
                            {isActive ? "Active" : "Inactive"}
                          </span>
                        </div>
                        <p className="truncate text-slate-400">
                          {formatDate(alert.createdAt)}
                        </p>
                        <div className="flex flex-wrap items-center justify-end gap-1.5">
                          <button
                            className="rounded-lg border border-slate-700/80 bg-slate-950/35 px-2.5 py-1.5 text-[11px] font-bold text-slate-300 transition hover:border-cyan-300/35 hover:text-cyan-300"
                            onClick={() => setFormTarget(alert)}
                            type="button"
                          >
                            Edit
                          </button>
                          <button
                            className="rounded-lg border border-slate-700/80 bg-slate-950/35 px-2.5 py-1.5 text-[11px] font-bold text-slate-300 transition hover:border-cyan-300/35 hover:text-cyan-300 disabled:cursor-not-allowed disabled:opacity-50"
                            disabled={togglingId === alert.id}
                            onClick={() => void toggleStatus(alert)}
                            type="button"
                          >
                            {isActive ? "Disable" : "Enable"}
                          </button>
                          <button
                            className="rounded-lg border border-rose-400/20 bg-rose-500/10 px-2.5 py-1.5 text-[11px] font-bold text-rose-300 transition hover:bg-rose-500/15"
                            onClick={() => setDeleteTarget(alert)}
                            type="button"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </>
        )}
      </GlowCard>

      {formTarget ? (
        <AlertFormModal
          alert={formTarget === "new" ? undefined : formTarget}
          onClose={() => setFormTarget(null)}
          onSaved={handleSaved}
        />
      ) : null}

      {/* Delete confirmation */}
      {deleteTarget ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-slate-700/80 bg-[#071426]/98 p-6 shadow-[0_24px_70px_rgba(0,0,0,0.5)]">
            <h2 className="text-xl font-black text-white">Delete this alert?</h2>
            <p className="mt-3 text-sm text-slate-300">
              <span className="font-bold text-white">{deleteTarget.name}</span>{" "}
              will be permanently removed. This cannot be undone.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                className="h-11 rounded-xl border border-slate-700/80 bg-slate-950/50 px-5 text-sm font-bold text-slate-300 disabled:opacity-60"
                disabled={isDeleting}
                onClick={() => setDeleteTarget(null)}
                type="button"
              >
                Cancel
              </button>
              <button
                className="h-11 rounded-xl bg-rose-600 px-5 text-sm font-black text-white hover:bg-rose-500 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={isDeleting}
                onClick={() => void runDelete()}
                type="button"
              >
                {isDeleting ? "Deleting..." : "Delete alert"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
