"use client";

import type { KeyboardEvent, ReactNode } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "conversion", label: "Conversion" },
  { id: "sales", label: "Sales" },
  { id: "products", label: "Products" },
  { id: "shoppers", label: "Shoppers" },
  { id: "behavior", label: "Behavior" },
] as const;

export type AnalyticsTabId = (typeof TABS)[number]["id"];

const TAB_IDS = new Set<string>(TABS.map((tab) => tab.id));

export function resolveAnalyticsTab(value: string | null): AnalyticsTabId {
  return value !== null && TAB_IDS.has(value)
    ? (value as AnalyticsTabId)
    : "overview";
}

export function AnalyticsTabs({
  panels,
}: {
  panels: Record<AnalyticsTabId, ReactNode>;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeTab = resolveAnalyticsTab(searchParams.get("tab"));

  function selectTab(tabId: AnalyticsTabId) {
    const params = new URLSearchParams(searchParams.toString());

    if (tabId === "overview") {
      params.delete("tab");
    } else {
      params.set("tab", tabId);
    }

    const query = params.toString();
    router.push(`${pathname}${query ? `?${query}` : ""}`, { scroll: false });
  }

  function handleKeyDown(
    event: KeyboardEvent<HTMLButtonElement>,
    index: number,
  ) {
    let nextIndex: number | null = null;

    if (event.key === "ArrowRight") {
      nextIndex = (index + 1) % TABS.length;
    } else if (event.key === "ArrowLeft") {
      nextIndex = (index - 1 + TABS.length) % TABS.length;
    } else if (event.key === "Home") {
      nextIndex = 0;
    } else if (event.key === "End") {
      nextIndex = TABS.length - 1;
    }

    if (nextIndex === null) {
      return;
    }

    event.preventDefault();
    const nextTab = TABS[nextIndex];
    selectTab(nextTab.id);
    document.getElementById(`analytics-tab-${nextTab.id}`)?.focus();
  }

  return (
    <div className="mt-6 min-w-0">
      <div className="overflow-x-auto border-b border-slate-800/80 pb-px">
        <div
          aria-label="Analytics sections"
          className="flex min-w-max gap-1"
          role="tablist"
        >
          {TABS.map((tab, index) => {
            const isActive = tab.id === activeTab;

            return (
              <button
                aria-controls={`analytics-panel-${tab.id}`}
                aria-selected={isActive}
                className={`relative rounded-t-lg px-4 py-3 text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/70 focus-visible:ring-inset ${
                  isActive
                    ? "bg-cyan-500/10 text-cyan-200"
                    : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
                }`}
                id={`analytics-tab-${tab.id}`}
                key={tab.id}
                onClick={() => selectTab(tab.id)}
                onKeyDown={(event) => handleKeyDown(event, index)}
                role="tab"
                tabIndex={isActive ? 0 : -1}
                type="button"
              >
                {tab.label}
                {isActive && (
                  <span className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-gradient-to-r from-blue-500 to-cyan-300" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div
        aria-labelledby={`analytics-tab-${activeTab}`}
        className="min-w-0"
        id={`analytics-panel-${activeTab}`}
        role="tabpanel"
      >
        {panels[activeTab]}
      </div>
    </div>
  );
}

export function AnalyticsTabsFallback() {
  return (
    <div aria-hidden="true" className="mt-6 overflow-hidden border-b border-slate-800/80">
      <div className="flex min-w-max gap-1">
        {TABS.map((tab) => (
          <span
            className="px-4 py-3 text-sm font-bold text-slate-500"
            key={tab.id}
          >
            {tab.label}
          </span>
        ))}
      </div>
    </div>
  );
}
