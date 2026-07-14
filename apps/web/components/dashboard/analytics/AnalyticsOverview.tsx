"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  ALL_PROJECTS_ID,
  TIME_RANGE_OPTIONS,
  useDashboardHeaderState,
} from "@/components/dashboard/layout/header/DashboardHeaderContext";
import { useAnalyticsTabData } from "@/hooks/useAnalyticsTabData";
import { validateAnalyticsDateRange } from "@/lib/analyticsDateRange";
import { AnalyticsEmptyState } from "./AnalyticsEmptyState";
import { AnalyticsRefreshBar } from "./AnalyticsRefreshBar";
import { AnalyticsTabPanel } from "./AnalyticsTabPanel";
import {
  AnalyticsTabs,
  AnalyticsTabsFallback,
  resolveAnalyticsTab,
  type AnalyticsTabId,
} from "./tabs/AnalyticsTabs";
import { BehaviorTab } from "./tabs/BehaviorTab";
import { ConversionTab } from "./tabs/ConversionTab";
import { OverviewTab } from "./tabs/OverviewTab";
import { ProductsTab } from "./tabs/ProductsTab";
import { SalesTab } from "./tabs/SalesTab";
import { ShoppersTab } from "./tabs/ShoppersTab";

export function AnalyticsOverview() {
  const searchParams = useSearchParams();
  const { selectedProjectId, selectedProject, timeRange } =
    useDashboardHeaderState();
  const activeTab = resolveAnalyticsTab(searchParams.get("tab"));

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

  const scopeParams = new URLSearchParams();
  if (selectedProjectId && selectedProjectId !== ALL_PROJECTS_ID) {
    scopeParams.set("projectId", selectedProjectId);
  }
  if (customRange) {
    scopeParams.set("range", "custom");
    scopeParams.set("from", customRange.from);
    scopeParams.set("to", customRange.to);
  } else if (timeRange && timeRange !== "all") {
    scopeParams.set("range", timeRange);
  }

  return (
    <AnalyticsScopedOverview
      activeTab={activeTab}
      customRangeError={customRangeError}
      isAllTime={isAllTime}
      key={scopeKey}
      scopeKey={scopeKey}
      scopeLabel={scopeLabel}
      scopeQuery={customRangeError ? null : scopeParams.toString()}
    />
  );
}

interface AnalyticsScopedOverviewProps {
  activeTab: AnalyticsTabId;
  customRangeError: string | null;
  isAllTime: boolean;
  scopeKey: string;
  scopeLabel: string;
  scopeQuery: string | null;
}

function AnalyticsScopedOverview({
  activeTab,
  customRangeError,
  isAllTime,
  scopeKey,
  scopeLabel,
  scopeQuery,
}: AnalyticsScopedOverviewProps) {
  const { activeLoading, getTabState, refreshActiveTab } =
    useAnalyticsTabData({ activeTab, scopeKey, scopeQuery });

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
          loading={activeLoading}
          onRefresh={refreshActiveTab}
        />
      </div>

      <p className="mt-3 text-xs text-slate-500">
        Based on events received in the selected time range. Percentages are
        calculated within the current filter scope.
        {isAllTime &&
          " \"All time\" includes every event ever ingested for this scope."}
      </p>

      {customRangeError ? (
        <div className="mt-8 flex h-64 items-center justify-center">
          <p className="text-center text-rose-400" role="alert">
            {customRangeError}
          </p>
        </div>
      ) : (
        <Suspense fallback={<AnalyticsTabsFallback />}>
          <AnalyticsTabs
            panels={{
              overview: (
                <AnalyticsTabPanel
                  label="overview"
                  onRetry={refreshActiveTab}
                  state={getTabState("overview")}
                >
                  {(data) =>
                    data.summary.totalEvents === 0 ? (
                      <AnalyticsEmptyState />
                    ) : (
                      <OverviewTab
                        comparison={data.comparison}
                        health={data.health}
                        insights={data.insights}
                        scopeLabel={scopeLabel}
                        summary={data.summary}
                        trend={data.trend}
                      />
                    )
                  }
                </AnalyticsTabPanel>
              ),
              conversion: (
                <AnalyticsTabPanel
                  label="conversion analytics"
                  onRetry={refreshActiveTab}
                  state={getTabState("conversion")}
                >
                  {(data) => (
                    <ConversionTab
                      commerceFunnel={data.commerceFunnel}
                      sessionFunnel={data.sessionFunnel}
                    />
                  )}
                </AnalyticsTabPanel>
              ),
              sales: <SalesTab />,
              products: (
                <AnalyticsTabPanel
                  label="product analytics"
                  onRetry={refreshActiveTab}
                  state={getTabState("products")}
                >
                  {(data) => (
                    <ProductsTab performance={data.productPerformance} />
                  )}
                </AnalyticsTabPanel>
              ),
              shoppers: (
                <AnalyticsTabPanel
                  label="shopper analytics"
                  onRetry={refreshActiveTab}
                  state={getTabState("shoppers")}
                >
                  {(data) => <ShoppersTab summary={data.shopperSummary} />}
                </AnalyticsTabPanel>
              ),
              behavior: (
                <AnalyticsTabPanel
                  label="behavior analytics"
                  onRetry={refreshActiveTab}
                  state={getTabState("behavior")}
                >
                  {(data) => (
                    <BehaviorTab
                      eventsByProject={data.eventsByProject}
                      recentActivity={data.recentActivity}
                      topEvents={data.topEvents}
                      topProperties={data.topProperties}
                    />
                  )}
                </AnalyticsTabPanel>
              ),
            }}
          />
        </Suspense>
      )}
    </div>
  );
}
