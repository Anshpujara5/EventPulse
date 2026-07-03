"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ALL_PROJECTS_ID,
  useDashboardHeaderState,
} from "@/components/dashboard/layout/header/DashboardHeaderContext";
import type { AnalyticsData } from "./analytics-types";
import { AnalyticsEmptyState } from "./AnalyticsEmptyState";
import { AnalyticsMetricCards } from "./AnalyticsMetricCards";
import { AnalyticsRefreshBar } from "./AnalyticsRefreshBar";
import { EventsByProjectCard } from "./EventsByProjectCard";
import { HourlyTrendChart } from "./HourlyTrendChart";
import { RecentActivityCard } from "./RecentActivityCard";
import { TopEventsCard } from "./TopEventsCard";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:5001";

type FetchState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "success"; data: AnalyticsData };

export function AnalyticsOverview() {
  const { selectedProjectId, timeRange } = useDashboardHeaderState();
  const [state, setState] = useState<FetchState>({ status: "loading" });

  const fetchAnalytics = useCallback(async () => {
    setState({ status: "loading" });
    try {
      const token =
        typeof window !== "undefined"
          ? localStorage.getItem("eventpulse_token")
          : null;

      const params = new URLSearchParams();
      // Scope analytics to the globally selected project from the header.
      if (selectedProjectId && selectedProjectId !== ALL_PROJECTS_ID) {
        params.set("projectId", selectedProjectId);
      }
      // Scope the analytical breakdowns to the header time range.
      if (timeRange && timeRange !== "all") {
        params.set("range", timeRange);
      }
      const query = params.toString();

      const res = await fetch(
        `${API_BASE}/api/analytics/summary${query ? `?${query}` : ""}`,
        {
          headers: { Authorization: `Bearer ${token ?? ""}` },
        },
      );

      if (!res.ok) {
        const body = (await res.json()) as { message?: string };
        setState({
          status: "error",
          message: body.message ?? "Failed to load analytics",
        });
        return;
      }

      const body = (await res.json()) as {
        success: boolean;
        data: AnalyticsData;
      };
      setState({ status: "success", data: body.data });
    } catch {
      setState({ status: "error", message: "Could not reach server" });
    }
  }, [selectedProjectId, timeRange]);

  useEffect(() => {
    void fetchAnalytics();
  }, [fetchAnalytics]);

  const isEmpty =
    state.status === "success" && state.data.summary.totalEvents === 0;

  return (
    <div className="mx-auto min-w-0 max-w-[1420px] px-4 py-5 sm:px-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight">Analytics</h1>
          <p className="mt-1 text-sm text-slate-400">
            Real metrics derived from your ingested events.
          </p>
        </div>
        <AnalyticsRefreshBar
          loading={state.status === "loading"}
          onRefresh={() => void fetchAnalytics()}
        />
      </div>

      {/* Loading */}
      {state.status === "loading" && (
        <div className="mt-8 flex h-64 items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="size-8 animate-spin rounded-full border-2 border-slate-700 border-t-cyan-400" />
            <p className="text-sm text-slate-500">Loading analytics…</p>
          </div>
        </div>
      )}

      {/* Error */}
      {state.status === "error" && (
        <div className="mt-8 flex h-64 flex-col items-center justify-center gap-4">
          <p className="text-rose-400">{state.message}</p>
          <button
            className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-bold text-white hover:bg-slate-700"
            onClick={() => void fetchAnalytics()}
            type="button"
          >
            Retry
          </button>
        </div>
      )}

      {/* Empty state */}
      {isEmpty && <AnalyticsEmptyState />}

      {/* Real data */}
      {state.status === "success" && !isEmpty && (
        <>
          <AnalyticsMetricCards summary={state.data.summary} />

          <section className="mt-4">
            <HourlyTrendChart buckets={state.data.hourlyTrend} />
          </section>

          <section className="mt-4 grid gap-4 xl:grid-cols-[1fr_1fr_1.2fr]">
            <TopEventsCard events={state.data.topEvents} />
            <EventsByProjectCard projects={state.data.eventsByProject} />
            <RecentActivityCard events={state.data.recentActivity} />
          </section>
        </>
      )}
    </div>
  );
}
