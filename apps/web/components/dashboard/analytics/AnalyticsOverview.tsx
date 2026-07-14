"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import {
  ALL_PROJECTS_ID,
  TIME_RANGE_OPTIONS,
  useDashboardHeaderState,
} from "@/components/dashboard/layout/header/DashboardHeaderContext";
import { apiRequest } from "@/lib/api";
import { validateAnalyticsDateRange } from "@/lib/analyticsDateRange";
import { useSearchParams } from "next/navigation";
import type { AnalyticsData } from "./analytics-types";
import { AnalyticsEmptyState } from "./AnalyticsEmptyState";
import { AnalyticsRefreshBar } from "./AnalyticsRefreshBar";
import {
  AnalyticsTabs,
  AnalyticsTabsFallback,
} from "./tabs/AnalyticsTabs";
import { BehaviorTab } from "./tabs/BehaviorTab";
import { ConversionTab } from "./tabs/ConversionTab";
import { OverviewTab } from "./tabs/OverviewTab";
import { ProductsTab } from "./tabs/ProductsTab";
import { SalesTab } from "./tabs/SalesTab";
import { ShoppersTab } from "./tabs/ShoppersTab";

type FetchState =
  | { status: "loading"; scopeKey: string }
  | { status: "error"; scopeKey: string; message: string }
  | { status: "success"; scopeKey: string; data: AnalyticsData };

interface AnalyticsResponse {
  success: boolean;
  data: AnalyticsData;
}

export function AnalyticsOverview() {
  const searchParams = useSearchParams();
  const { selectedProjectId, selectedProject, timeRange } =
    useDashboardHeaderState();
  const [state, setState] = useState<FetchState | null>(null);
  const latestRequestId = useRef(0);

  const rangeParam = searchParams.get("range");
  const fromParam = searchParams.get("from");
  const toParam = searchParams.get("to");
  const customRangeValidation =
    rangeParam === "custom"
      ? validateAnalyticsDateRange(fromParam, toParam)
      : null;
  const customRange = customRangeValidation?.valid
    ? customRangeValidation.value
    : null;
  const customFrom = customRange?.from ?? null;
  const customTo = customRange?.to ?? null;
  const customRangeError =
    customRangeValidation && !customRangeValidation.valid
      ? customRangeValidation.message
      : null;

  const timeRangeLabel = customRange
    ? customRange.label
    : rangeParam === "custom"
      ? "Custom range"
      : (TIME_RANGE_OPTIONS.find((option) => option.value === timeRange)?.label ??
        "All time");
  const projectLabel =
    selectedProjectId === ALL_PROJECTS_ID
      ? "All projects"
      : (selectedProject?.name ?? "Selected project");
  const scopeLabel = `${projectLabel} · ${timeRangeLabel}`;
  const isAllTime = rangeParam !== "custom" && timeRange === "all";
  const scopeKey = `${selectedProjectId}:${
    customRange
      ? `custom:${customRange.from}:${customRange.to}`
      : rangeParam === "custom"
        ? `invalid-custom:${fromParam ?? ""}:${toParam ?? ""}`
        : `preset:${timeRange}`
  }`;

  const requestAnalytics = useCallback(async (): Promise<AnalyticsData> => {
    const token =
      typeof window !== "undefined"
        ? localStorage.getItem("eventpulse_token")
        : null;

    const params = new URLSearchParams();
    if (selectedProjectId && selectedProjectId !== ALL_PROJECTS_ID) {
      params.set("projectId", selectedProjectId);
    }
    if (customFrom && customTo) {
      params.set("range", "custom");
      params.set("from", customFrom);
      params.set("to", customTo);
    } else if (timeRange && timeRange !== "all") {
      params.set("range", timeRange);
    }
    const query = params.toString();

    const body = await apiRequest<AnalyticsResponse>(
      `/api/analytics/summary${query ? `?${query}` : ""}`,
      {
        headers: { Authorization: `Bearer ${token ?? ""}` },
      },
    );

    return body.data;
  }, [customFrom, customTo, selectedProjectId, timeRange]);

  useEffect(() => {
    if (customRangeError) {
      latestRequestId.current += 1;
      return;
    }

    const requestId = ++latestRequestId.current;
    void requestAnalytics()
      .then((data) => {
        if (requestId === latestRequestId.current) {
          setState({ status: "success", scopeKey, data });
        }
      })
      .catch((error: unknown) => {
        if (requestId === latestRequestId.current) {
          setState({
            status: "error",
            scopeKey,
            message:
              error instanceof Error ? error.message : "Could not reach server",
          });
        }
      });

    return () => {
      latestRequestId.current += 1;
    };
  }, [customRangeError, requestAnalytics, scopeKey]);

  const currentState: FetchState = customRangeError
    ? { status: "error", scopeKey, message: customRangeError }
    : state?.scopeKey === scopeKey
      ? state
      : { status: "loading", scopeKey };

  const isEmpty =
    currentState.status === "success" &&
    currentState.data.summary.totalEvents === 0;

  function refreshAnalytics() {
    if (customRangeError) {
      return;
    }

    setState({ status: "loading", scopeKey });
    const requestId = ++latestRequestId.current;
    void requestAnalytics()
      .then((data) => {
        if (requestId === latestRequestId.current) {
          setState({ status: "success", scopeKey, data });
        }
      })
      .catch((error: unknown) => {
        if (requestId === latestRequestId.current) {
          setState({
            status: "error",
            scopeKey,
            message:
              error instanceof Error ? error.message : "Could not reach server",
          });
        }
      });
  }

  return (
    <div className="mx-auto min-w-0 max-w-[1420px] px-4 py-5 sm:px-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight">Analytics</h1>
          <p className="mt-1 text-sm text-slate-400">
            Real commerce metrics derived from your store&apos;s ingested events.
          </p>
          <p className="mt-2 text-xs font-bold text-cyan-300">
            Scope: {scopeLabel}
          </p>
        </div>
        <AnalyticsRefreshBar
          loading={currentState.status === "loading"}
          onRefresh={refreshAnalytics}
        />
      </div>

      <p className="mt-3 text-xs text-slate-500">
        Based on events received in the selected time range. Percentages are
        calculated within the current filter scope.
        {isAllTime &&
          " \"All time\" includes every event ever ingested for this scope."}
      </p>

      {/* Loading */}
      {currentState.status === "loading" && (
        <div className="mt-8 flex h-64 items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="size-8 animate-spin rounded-full border-2 border-slate-700 border-t-cyan-400" />
            <p className="text-sm text-slate-500">Loading analytics…</p>
          </div>
        </div>
      )}

      {/* Error */}
      {currentState.status === "error" && (
        <div className="mt-8 flex h-64 flex-col items-center justify-center gap-4">
          <p className="text-center text-rose-400" role="alert">
            {currentState.message}
          </p>
          {!customRangeError ? (
            <button
              className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-bold text-white hover:bg-slate-700"
              onClick={refreshAnalytics}
              type="button"
            >
              Retry
            </button>
          ) : null}
        </div>
      )}

      {/* Empty state */}
      {isEmpty && <AnalyticsEmptyState />}

      {/* Real data */}
      {currentState.status === "success" && !isEmpty && (
        <Suspense fallback={<AnalyticsTabsFallback />}>
          <AnalyticsTabs
            panels={{
              overview: (
                <OverviewTab
                  comparison={currentState.data.comparison}
                  health={currentState.data.health}
                  insights={currentState.data.insights}
                  scopeLabel={scopeLabel}
                  summary={currentState.data.summary}
                  trend={currentState.data.trend}
                />
              ),
              conversion: (
                <ConversionTab
                  commerceFunnel={currentState.data.commerceFunnel}
                  sessionFunnel={currentState.data.sessionFunnel}
                />
              ),
              sales: <SalesTab />,
              products: (
                <ProductsTab performance={currentState.data.productPerformance} />
              ),
              shoppers: (
                <ShoppersTab summary={currentState.data.shopperSummary} />
              ),
              behavior: (
                <BehaviorTab
                  eventsByProject={currentState.data.eventsByProject}
                  recentActivity={currentState.data.recentActivity}
                  topEvents={currentState.data.topEvents}
                  topProperties={currentState.data.topProperties}
                />
              ),
            }}
          />
        </Suspense>
      )}
    </div>
  );
}
