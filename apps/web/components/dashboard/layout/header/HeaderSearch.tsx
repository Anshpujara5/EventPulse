"use client";

import { Icon } from "@/components/common/Icon";
import { usePathname } from "next/navigation";
import { useDashboardHeaderState } from "./DashboardHeaderContext";

// Pages whose visible data the shared search query actually filters.
const SEARCH_PLACEHOLDERS: Record<string, string> = {
  "/dashboard": "Search projects & API keys...",
  "/dashboard/projects": "Search projects...",
  "/dashboard/api-keys": "Search API keys...",
  "/dashboard/events": "Search events by name...",
};

export function HeaderSearch() {
  const pathname = usePathname();
  const { searchQuery, setSearchQuery } = useDashboardHeaderState();

  const placeholder = SEARCH_PLACEHOLDERS[pathname];
  const isSearchable = placeholder !== undefined;

  return (
    <div className="min-w-0 shrink">
      <div
        className={`flex h-12 w-64 items-center gap-3 rounded-xl border px-4 md:w-80 xl:w-[410px] ${
          isSearchable
            ? "border-slate-700/80 bg-slate-950/60 text-slate-400"
            : "border-slate-800/70 bg-slate-950/40 text-slate-600"
        }`}
        title={
          isSearchable ? undefined : "Search isn’t available on this page"
        }
      >
        <Icon name="search" className="size-5" />
        <input
          className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-slate-500 disabled:cursor-not-allowed"
          disabled={!isSearchable}
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder={
            isSearchable ? placeholder : "Search isn’t available here"
          }
          value={isSearchable ? searchQuery : ""}
        />
        {isSearchable && searchQuery ? (
          <button
            aria-label="Clear search"
            className="shrink-0 text-slate-500 transition hover:text-white"
            onClick={() => setSearchQuery("")}
            type="button"
          >
            ✕
          </button>
        ) : null}
      </div>
    </div>
  );
}
