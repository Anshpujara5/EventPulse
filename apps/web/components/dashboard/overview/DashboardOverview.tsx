"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ALL_PROJECTS_ID,
  useDashboardHeaderState,
} from "@/components/dashboard/layout/header/DashboardHeaderContext";
import { API_BASE, getAuthHeaders } from "@/lib/api";
import type { DashboardSummary } from "./dashboard-types";
import { DashboardStats } from "./DashboardStats";
import { EmptyDashboard } from "./EmptyDashboard";
import { EventsComingSoonCard } from "./EventsComingSoonCard";
import { RecentApiKeysCard } from "./RecentApiKeysCard";
import { RecentProjectsCard } from "./RecentProjectsCard";

type FetchState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "success"; data: DashboardSummary };

export function DashboardOverview() {
  const { searchQuery, selectedProjectId, selectedProject } =
    useDashboardHeaderState();
  const [state, setState] = useState<FetchState>({ status: "loading" });

  function fetchSummary() {
    return Promise.resolve()
      .then(() => {
        return fetch(`${API_BASE}/api/dashboard/summary`, {
          headers: getAuthHeaders(),
        });
      })
      .then(async (res) => {
        if (!res.ok) {
          const body = (await res.json()) as { message?: string };
          setState({
            status: "error",
            message: body.message ?? "Failed to load dashboard",
          });
          return;
        }

        const body = (await res.json()) as {
          success: boolean;
          data: { summary: DashboardSummary };
        };
        setState({ status: "success", data: body.data.summary });
      })
      .catch(() => {
        setState({ status: "error", message: "Could not reach server" });
      });
  }

  useEffect(() => {
    void fetchSummary();
  }, []);

  function retrySummary() {
    setState({ status: "loading" });
    void fetchSummary();
  }

  const isEmpty =
    state.status === "success" &&
    state.data.totalProjects === 0 &&
    state.data.totalApiKeys === 0;

  // The header search + project selector filter the recent lists client-side.
  // Stat cards stay global account totals (no per-project/time meaning).
  const isScoped = selectedProjectId !== ALL_PROJECTS_ID;
  const query = searchQuery.trim().toLowerCase();
  const isFiltering = isScoped || query.length > 0;

  const filtered = useMemo(() => {
    if (state.status !== "success") {
      return { projects: [], apiKeys: [] };
    }

    const projects = state.data.recentProjects.filter((project) => {
      const matchesScope = !isScoped || project.id === selectedProjectId;
      const matchesSearch =
        !query ||
        [project.name, project.domain, project.status].some((value) =>
          value.toLowerCase().includes(query),
        );
      return matchesScope && matchesSearch;
    });

    const apiKeys = state.data.recentApiKeys.filter((apiKey) => {
      const matchesScope = !isScoped || apiKey.project.id === selectedProjectId;
      const matchesSearch =
        !query ||
        [
          apiKey.name,
          apiKey.project.name,
          apiKey.maskedKey,
          apiKey.keyPrefix,
          apiKey.status,
        ].some((value) => value.toLowerCase().includes(query));
      return matchesScope && matchesSearch;
    });

    return { projects, apiKeys };
  }, [state, isScoped, selectedProjectId, query]);

  const scopeNote = (() => {
    if (!isFiltering) {
      return null;
    }
    const parts: string[] = [];
    if (isScoped) {
      parts.push(`project “${selectedProject?.name ?? "Selected"}”`);
    }
    if (query) {
      parts.push(`matching “${searchQuery.trim()}”`);
    }
    return `Recent lists filtered by ${parts.join(" · ")}`;
  })();

  return (
    <div className="mx-auto min-w-0 max-w-[1420px] px-4 py-5 sm:px-6">
      <div className="mb-4">
        <h1 className="text-3xl font-black tracking-tight">Dashboard</h1>
        <p className="mt-1 text-sm text-slate-400">
          An overview of your stores, API keys, and commerce event activity.
        </p>
      </div>

      {state.status === "loading" && (
        <div className="flex h-64 items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="size-8 animate-spin rounded-full border-2 border-slate-700 border-t-cyan-400" />
            <p className="text-sm text-slate-500">Loading dashboard…</p>
          </div>
        </div>
      )}

      {state.status === "error" && (
        <div className="flex h-64 flex-col items-center justify-center gap-4">
          <p className="text-rose-400">{state.message}</p>
          <button
            className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-bold text-white hover:bg-slate-700"
            onClick={retrySummary}
            type="button"
          >
            Retry
          </button>
        </div>
      )}

      {state.status === "success" && isEmpty && <EmptyDashboard />}

      {state.status === "success" && !isEmpty && (
        <>
          <DashboardStats summary={state.data} />

          {scopeNote ? (
            <p className="mt-4 text-xs font-bold text-slate-400">{scopeNote}</p>
          ) : null}

          <section className="mt-4 grid gap-4 xl:grid-cols-2">
            <RecentProjectsCard
              projects={filtered.projects}
              emptyLabel={isFiltering ? "No matching projects." : undefined}
            />
            <RecentApiKeysCard
              apiKeys={filtered.apiKeys}
              emptyLabel={isFiltering ? "No matching API keys." : undefined}
            />
          </section>

          <section className="mt-4">
            <EventsComingSoonCard />
          </section>
        </>
      )}
    </div>
  );
}
