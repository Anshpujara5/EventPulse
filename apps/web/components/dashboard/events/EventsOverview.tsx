"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ALL_PROJECTS_ID,
  useDashboardHeaderState,
} from "@/components/dashboard/layout/header/DashboardHeaderContext";
import { API_BASE, getAuthHeaders } from "@/lib/api";
import type { EventRecord, EventSummary } from "./event-types";
import { EventDetailsDrawer } from "./EventDetailsDrawer";
import { EventsEmptyState } from "./EventsEmptyState";
import { EventsMetricCards } from "./EventsMetricCards";
import { EventsSearchBar } from "./EventsSearchBar";
import { EventsTable } from "./EventsTable";

type FetchState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | {
      status: "success";
      events: EventRecord[];
      summary: EventSummary;
    };

export function EventsOverview() {
  const { selectedProjectId, timeRange, searchQuery, setSearchQuery } =
    useDashboardHeaderState();
  const [state, setState] = useState<FetchState>({ status: "loading" });
  const [selected, setSelected] = useState<EventRecord | null>(null);

  const fetchEvents = useCallback(
    async (nameFilter?: string) => {
      setState({ status: "loading" });
      try {
        const params = new URLSearchParams({ limit: "50" });
        if (nameFilter) params.set("name", nameFilter);
        // Scope to the globally selected project from the header, if any.
        if (selectedProjectId && selectedProjectId !== ALL_PROJECTS_ID) {
          params.set("projectId", selectedProjectId);
        }
        // Scope to the header time range (backend filters events by createdAt).
        if (timeRange && timeRange !== "all") {
          params.set("range", timeRange);
        }

        const res = await fetch(`${API_BASE}/api/events?${params.toString()}`, {
          headers: getAuthHeaders(),
        });

        if (!res.ok) {
          const body = (await res.json()) as { message?: string };
          setState({
            status: "error",
            message: body.message ?? "Failed to load events",
          });
          return;
        }

        const body = (await res.json()) as {
          success: boolean;
          data: { events: EventRecord[]; summary: EventSummary };
        };
        setState({
          status: "success",
          events: body.data.events,
          summary: body.data.summary,
        });
        setSelected(null);
      } catch {
        setState({ status: "error", message: "Could not reach server" });
      }
    },
    [selectedProjectId, timeRange],
  );

  // Debounce search; also refetches when the header project/time scope changes.
  useEffect(() => {
    const t = setTimeout(() => {
      void fetchEvents(searchQuery.trim() || undefined);
    }, 300);
    return () => clearTimeout(t);
  }, [searchQuery, fetchEvents]);

  const isEmpty =
    state.status === "success" && state.events.length === 0 && !searchQuery;

  return (
    <div className="mx-auto min-w-0 max-w-[1420px] px-4 py-5 sm:px-6">
      <div>
        <h1 className="text-3xl font-black tracking-tight">Events</h1>
        <p className="mt-1 text-sm text-slate-400">
          Real-time commerce event stream — shopper actions ingested via your
          API keys.
        </p>
      </div>

      {/* Metric cards */}
      {state.status === "success" && (
        <EventsMetricCards summary={state.summary} />
      )}
      {state.status === "loading" && (
        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[...Array(2)].map((_, i) => (
            <div
              className="h-24 animate-pulse rounded-2xl border border-slate-700/70 bg-slate-800/40"
              key={i}
            />
          ))}
        </div>
      )}

      {/* Search bar */}
      <div className="mt-5">
        <EventsSearchBar
          value={searchQuery}
          onChange={setSearchQuery}
          onRefresh={() => void fetchEvents(searchQuery.trim() || undefined)}
          loading={state.status === "loading"}
        />
      </div>

      {/* Loading */}
      {state.status === "loading" && (
        <div className="mt-6 flex h-64 items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="size-8 animate-spin rounded-full border-2 border-slate-700 border-t-cyan-400" />
            <p className="text-sm text-slate-500">Loading events…</p>
          </div>
        </div>
      )}

      {/* Error */}
      {state.status === "error" && (
        <div className="mt-6 flex h-64 flex-col items-center justify-center gap-4">
          <p className="text-rose-400">{state.message}</p>
          <button
            className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-bold text-white hover:bg-slate-700"
            onClick={() => void fetchEvents(searchQuery.trim() || undefined)}
            type="button"
          >
            Retry
          </button>
        </div>
      )}

      {/* Empty — no events ingested yet */}
      {isEmpty && <EventsEmptyState />}

      {/* Events table — full width; details open in a drawer on click */}
      {state.status === "success" && state.events.length > 0 && (
        <section className="mt-4">
          <EventsTable
            events={state.events}
            matching={state.summary.matching}
            selected={selected}
            onSelect={setSelected}
          />
        </section>
      )}

      <EventDetailsDrawer event={selected} onClose={() => setSelected(null)} />

      {/* Search returned nothing */}
      {state.status === "success" &&
        state.events.length === 0 &&
        searchQuery.trim() && (
          <div className="mt-12 flex flex-col items-center gap-2 text-center">
            <p className="font-bold text-slate-400">
              No events matching &ldquo;{searchQuery}&rdquo;
            </p>
            <button
              className="mt-2 text-sm font-bold text-cyan-400 hover:text-cyan-300"
              onClick={() => setSearchQuery("")}
              type="button"
            >
              Clear search
            </button>
          </div>
        )}
    </div>
  );
}
