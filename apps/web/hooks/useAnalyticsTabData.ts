"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type {
  AnalyticsDataTabId,
  AnalyticsTabDataMap,
} from "@/components/dashboard/analytics/analytics-types";
import type { AnalyticsTabId } from "@/components/dashboard/analytics/tabs/AnalyticsTabs";
import { apiRequest } from "@/lib/api";

export type AnalyticsTabLoadState<T> =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "success"; data: T };

type CachedTabState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "success"; data: unknown };

interface AnalyticsTabCache {
  scopeKey: string;
  tabs: Partial<Record<AnalyticsDataTabId, CachedTabState>>;
}

interface UseAnalyticsTabDataOptions {
  activeTab: AnalyticsTabId;
  scopeKey: string;
  scopeQuery: string | null;
}

interface AnalyticsResponse<T> {
  success: boolean;
  data: T;
}

function isDataTab(tab: AnalyticsTabId): tab is AnalyticsDataTabId {
  return tab !== "sales";
}

async function requestAnalyticsTab<T extends AnalyticsDataTabId>(
  tab: T,
  scopeQuery: string,
): Promise<AnalyticsTabDataMap[T]> {
  const token = localStorage.getItem("eventpulse_token");
  const params = new URLSearchParams(scopeQuery);
  params.set("tab", tab);

  const body = await apiRequest<AnalyticsResponse<AnalyticsTabDataMap[T]>>(
    `/api/analytics/summary?${params.toString()}`,
    {
      headers: { Authorization: `Bearer ${token ?? ""}` },
    },
  );

  return body.data;
}

export function useAnalyticsTabData({
  activeTab,
  scopeKey,
  scopeQuery,
}: UseAnalyticsTabDataOptions) {
  const [cache, setCache] = useState<AnalyticsTabCache>(() => ({
    scopeKey,
    tabs: {},
  }));
  const latestRequestIds = useRef<Record<AnalyticsDataTabId, number>>({
    overview: 0,
    conversion: 0,
    products: 0,
    shoppers: 0,
    behavior: 0,
  });

  const activeState =
    isDataTab(activeTab) && cache.scopeKey === scopeKey
      ? cache.tabs[activeTab]
      : undefined;

  useEffect(() => {
    if (!isDataTab(activeTab) || scopeQuery === null) {
      return;
    }

    const cachedState =
      cache.scopeKey === scopeKey ? cache.tabs[activeTab] : undefined;
    if (cachedState && cachedState.status !== "loading") {
      return;
    }

    const tab = activeTab;
    const requestIds = latestRequestIds.current;
    const requestId = ++requestIds[tab];

    void requestAnalyticsTab(tab, scopeQuery)
      .then((data) => {
        if (requestId !== requestIds[tab]) {
          return;
        }

        setCache((current) => ({
          scopeKey,
          tabs: {
            ...(current.scopeKey === scopeKey ? current.tabs : {}),
            [tab]: { status: "success", data },
          },
        }));
      })
      .catch((error: unknown) => {
        if (requestId !== requestIds[tab]) {
          return;
        }

        setCache((current) => ({
          scopeKey,
          tabs: {
            ...(current.scopeKey === scopeKey ? current.tabs : {}),
            [tab]: {
              status: "error",
              message:
                error instanceof Error
                  ? error.message
                  : "Could not reach server",
            },
          },
        }));
      });

    return () => {
      if (requestIds[tab] === requestId) {
        requestIds[tab] += 1;
      }
    };
  }, [activeTab, cache, scopeKey, scopeQuery]);

  const refreshActiveTab = useCallback(() => {
    if (!isDataTab(activeTab) || scopeQuery === null) {
      return;
    }

    setCache((current) => ({
      scopeKey,
      tabs: {
        ...(current.scopeKey === scopeKey ? current.tabs : {}),
        [activeTab]: { status: "loading" },
      },
    }));
  }, [activeTab, scopeKey, scopeQuery]);

  function getTabState<T extends AnalyticsDataTabId>(
    tab: T,
  ): AnalyticsTabLoadState<AnalyticsTabDataMap[T]> {
    const state = cache.scopeKey === scopeKey ? cache.tabs[tab] : undefined;

    if (!state || state.status === "loading") {
      return { status: "loading" };
    }
    if (state.status === "error") {
      return state;
    }

    return {
      status: "success",
      data: state.data as AnalyticsTabDataMap[T],
    };
  }

  return {
    activeLoading:
      scopeQuery !== null &&
      isDataTab(activeTab) &&
      (!activeState || activeState.status === "loading"),
    getTabState,
    refreshActiveTab,
  };
}
