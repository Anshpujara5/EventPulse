"use client";

import { useEffect, useState } from "react";
import type { EventRecord, EventSummary } from "./event-types";
import { EventsEmptyState } from "./EventsEmptyState";
import { EventsMetricCards } from "./EventsMetricCards";
import { EventsSearchBar } from "./EventsSearchBar";
import { EventsTable } from "./EventsTable";
import { SelectedEventPanel } from "./SelectedEventPanel";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:5001";

type FetchState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | {
      status: "success";
      events: EventRecord[];
      summary: EventSummary;
    };

export function EventsOverview() {
  const [state, setState] = useState<FetchState>({ status: "loading" });
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<EventRecord | null>(null);

  async function fetchEvents(nameFilter?: string) {
    setState({ status: "loading" });
    try {
      const token =
        typeof window !== "undefined"
          ? localStorage.getItem("eventpulse_token")
          : null;

      const params = new URLSearchParams({ limit: "50" });
      if (nameFilter) params.set("name", nameFilter);

      const res = await fetch(`${API_BASE}/api/events?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token ?? ""}` },
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
  }

  useEffect(() => {
    void fetchEvents();
  }, []);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => {
      void fetchEvents(search.trim() || undefined);
    }, 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const isEmpty =
    state.status === "success" && state.events.length === 0 && !search;

  return (
    <div className="mx-auto max-w-[1420px] px-4 py-5 sm:px-6">
      <div>
        <h1 className="text-3xl font-black tracking-tight">Events</h1>
        <p className="mt-1 text-sm text-slate-400">
          Real-time event stream ingested via your API keys.
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
          value={search}
          onChange={setSearch}
          onRefresh={() => void fetchEvents(search.trim() || undefined)}
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
            onClick={() => void fetchEvents(search.trim() || undefined)}
            type="button"
          >
            Retry
          </button>
        </div>
      )}

      {/* Empty — no events ingested yet */}
      {isEmpty && <EventsEmptyState />}

      {/* Events table + detail panel */}
      {state.status === "success" && state.events.length > 0 && (
        <section className="mt-4 grid gap-4 xl:grid-cols-[1.5fr_0.9fr]">
          <EventsTable
            events={state.events}
            selected={selected}
            onSelect={setSelected}
          />
          <SelectedEventPanel event={selected} />
        </section>
      )}

      {/* Search returned nothing */}
      {state.status === "success" &&
        state.events.length === 0 &&
        search.trim() && (
          <div className="mt-12 flex flex-col items-center gap-2 text-center">
            <p className="font-bold text-slate-400">
              No events matching &ldquo;{search}&rdquo;
            </p>
            <button
              className="mt-2 text-sm font-bold text-cyan-400 hover:text-cyan-300"
              onClick={() => setSearch("")}
              type="button"
            >
              Clear search
            </button>
          </div>
        )}
    </div>
  );
}
