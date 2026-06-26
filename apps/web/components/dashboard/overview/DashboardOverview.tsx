"use client";

import { useEffect, useState } from "react";
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

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:5001";

export function DashboardOverview() {
  const [state, setState] = useState<FetchState>({ status: "loading" });

  async function fetchSummary() {
    setState({ status: "loading" });
    try {
      const token =
        typeof window !== "undefined"
          ? localStorage.getItem("eventpulse_token")
          : null;

      const res = await fetch(`${API_BASE}/api/dashboard/summary`, {
        headers: {
          Authorization: `Bearer ${token ?? ""}`,
        },
      });

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
    } catch {
      setState({ status: "error", message: "Could not reach server" });
    }
  }

  useEffect(() => {
    void fetchSummary();
  }, []);

  const isEmpty =
    state.status === "success" &&
    state.data.totalProjects === 0 &&
    state.data.totalApiKeys === 0;

  return (
    <div className="mx-auto max-w-[1420px] px-4 py-5 sm:px-6">
      <div className="mb-4">
        <h1 className="text-3xl font-black tracking-tight">Dashboard</h1>
        <p className="mt-1 text-sm text-slate-400">
          Monitor your projects and API keys.
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
            onClick={() => void fetchSummary()}
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

          <section className="mt-4 grid gap-4 xl:grid-cols-2">
            <RecentProjectsCard projects={state.data.recentProjects} />
            <RecentApiKeysCard apiKeys={state.data.recentApiKeys} />
          </section>

          <section className="mt-4">
            <EventsComingSoonCard />
          </section>
        </>
      )}
    </div>
  );
}
