"use client";

import { GlowCard } from "@/components/common/GlowCard";
import { Icon } from "@/components/common/Icon";
import type { ApiKey } from "@/components/dashboard/api-keys/api-key-types";
import type { EventRecord } from "@/components/dashboard/events/event-types";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { Project } from "./ProjectCard";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:5001";

type Status = "loading" | "notFound" | "error" | "success";

interface ProjectSummary {
  totalEvents: number;
  eventsLast24h: number;
  totalApiKeys: number;
  activeApiKeys: number;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function authHeaders(): Record<string, string> {
  const token =
    typeof window !== "undefined"
      ? localStorage.getItem("eventpulse_token")
      : null;
  return { Authorization: `Bearer ${token ?? ""}` };
}

export function ProjectView({ projectId }: { projectId: string }) {
  const [status, setStatus] = useState<Status>("loading");
  const [errorMsg, setErrorMsg] = useState("");
  const [project, setProject] = useState<Project | null>(null);
  const [summary, setSummary] = useState<ProjectSummary | null>(null);
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [events, setEvents] = useState<EventRecord[]>([]);
  const [copied, setCopied] = useState<string | null>(null);

  const load = useCallback(async () => {
    setStatus("loading");
    setErrorMsg("");
    const headers = authHeaders();

    try {
      const projectRes = await fetch(
        `${API_BASE}/api/projects/${projectId}`,
        { headers },
      );

      if (projectRes.status === 404) {
        setStatus("notFound");
        return;
      }

      if (!projectRes.ok) {
        const body = (await projectRes.json()) as { message?: string };
        setErrorMsg(body.message ?? "Failed to load project");
        setStatus("error");
        return;
      }

      const projectBody = (await projectRes.json()) as {
        data: { project: Project };
      };
      setProject(projectBody.data.project);

      // Counts + related lists reuse existing endpoints (api-keys is filtered
      // client-side; events is scoped by projectId on the backend).
      const [summaryRes, keysRes, eventsRes] = await Promise.all([
        fetch(`${API_BASE}/api/projects/${projectId}/summary`, { headers }),
        fetch(`${API_BASE}/api/api-keys`, { headers }),
        fetch(`${API_BASE}/api/events?projectId=${projectId}&limit=10`, {
          headers,
        }),
      ]);

      if (summaryRes.ok) {
        const body = (await summaryRes.json()) as {
          data: { summary: ProjectSummary };
        };
        setSummary(body.data.summary);
      } else {
        setSummary(null);
      }

      if (keysRes.ok) {
        const body = (await keysRes.json()) as {
          data: { apiKeys: ApiKey[] };
        };
        setApiKeys(
          body.data.apiKeys.filter((key) => key.project.id === projectId),
        );
      }

      if (eventsRes.ok) {
        const body = (await eventsRes.json()) as {
          data: { events: EventRecord[] };
        };
        setEvents(body.data.events);
      }

      setStatus("success");
    } catch {
      setErrorMsg("Could not reach server");
      setStatus("error");
    }
  }, [projectId]);

  useEffect(() => {
    void load();
  }, [load]);

  function copy(id: string, text: string) {
    void navigator.clipboard.writeText(text).then(() => {
      setCopied(id);
      setTimeout(() => setCopied(null), 1500);
    });
  }

  const backLink = (
    <Link
      className="inline-flex items-center gap-2 text-sm font-bold text-slate-400 transition hover:text-cyan-300"
      href="/dashboard/projects"
    >
      <span aria-hidden>←</span> Projects
    </Link>
  );

  if (status === "loading") {
    return (
      <div className="mx-auto max-w-[1420px] px-4 py-5 sm:px-6">
        {backLink}
        <div className="mt-6 flex h-64 items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="size-8 animate-spin rounded-full border-2 border-slate-700 border-t-cyan-400" />
            <p className="text-sm text-slate-500">Loading project…</p>
          </div>
        </div>
      </div>
    );
  }

  if (status === "notFound") {
    return (
      <div className="mx-auto max-w-[1420px] px-4 py-5 sm:px-6">
        {backLink}
        <div className="mt-10 flex flex-col items-center gap-3 text-center">
          <div className="flex size-12 items-center justify-center rounded-full border border-slate-800/70 bg-slate-900/60 text-slate-500">
            <Icon name="folder" className="size-6" />
          </div>
          <p className="text-lg font-black text-white">Project not found</p>
          <p className="max-w-md text-sm text-slate-400">
            This project doesn&apos;t exist or you don&apos;t have access to it.
          </p>
          <Link
            className="mt-2 rounded-xl border border-slate-700/80 bg-slate-950/40 px-4 py-2 text-sm font-bold text-slate-300 transition hover:border-cyan-300/35 hover:text-cyan-300"
            href="/dashboard/projects"
          >
            Back to Projects
          </Link>
        </div>
      </div>
    );
  }

  if (status === "error" || !project) {
    return (
      <div className="mx-auto max-w-[1420px] px-4 py-5 sm:px-6">
        {backLink}
        <div className="mt-10 flex flex-col items-center gap-4 text-center">
          <p className="text-rose-400">{errorMsg || "Failed to load project"}</p>
          <button
            className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-bold text-white hover:bg-slate-700"
            onClick={() => void load()}
            type="button"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const isActive = project.status === "ACTIVE";
  const isArchived = !isActive;
  const hasActiveKey = apiKeys.some((key) => key.status === "ACTIVE");
  const ingestEndpoint = `${API_BASE}/api/events/ingest`;
  const sampleBody = `{
  "name": "page_view",
  "properties": {
    "path": "/dashboard",
    "source": "demo"
  }
}`;
  const sampleCurl = `curl -X POST ${ingestEndpoint} \\
  -H "Authorization: Bearer <API_KEY>" \\
  -H "Content-Type: application/json" \\
  -d '{"name":"page_view","properties":{"path":"/dashboard","source":"demo"}}'`;

  const summaryCards = [
    {
      label: "Total Events",
      value: summary ? summary.totalEvents.toLocaleString() : "—",
      detail: summary ? "Ingested for this project" : "Unavailable",
      icon: "pulse",
      tone: "text-blue-400",
      boxClassName: "border-blue-400/25 bg-blue-500/10",
    },
    {
      label: "API Keys",
      value: summary ? summary.totalApiKeys.toLocaleString() : "—",
      detail: summary ? `${summary.activeApiKeys} active` : "Unavailable",
      icon: "key",
      tone: "text-cyan-400",
      boxClassName: "border-cyan-400/25 bg-cyan-500/10",
    },
    {
      label: "Recent Events",
      value: summary ? summary.eventsLast24h.toLocaleString() : "—",
      detail: summary ? "Last 24 hours" : "Unavailable",
      icon: "clock",
      tone: "text-violet-400",
      boxClassName: "border-violet-400/25 bg-violet-500/10",
    },
  ];

  return (
    <div className="mx-auto max-w-[1420px] px-4 py-5 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {backLink}
        <Link
          className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-700/80 bg-slate-950/40 px-4 text-sm font-bold text-slate-300 transition hover:border-cyan-300/35 hover:text-cyan-300"
          href={`/dashboard/projects/${project.id}/settings`}
        >
          <Icon name="settings" className="size-4" />
          Settings
        </Link>
      </div>

      {/* Project header */}
      <GlowCard className="mt-4 p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex min-w-0 items-center gap-4">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl border border-cyan-400/35 bg-cyan-500/10 text-cyan-400">
              <Icon name="cube" className="size-6" />
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-3xl font-black tracking-tight text-white">
                {project.name}
              </h1>
              {project.domain ? (
                <p className="mt-1 truncate text-sm text-slate-400">
                  {project.domain}
                </p>
              ) : null}
            </div>
          </div>
          <span
            className={`inline-flex h-fit items-center gap-2 rounded-full border px-3 py-1 text-xs font-black ${
              isActive
                ? "border-emerald-400/20 bg-emerald-500/10 text-emerald-300"
                : "border-rose-400/20 bg-rose-500/10 text-rose-300"
            }`}
          >
            <span
              className={`size-2 rounded-full ${
                isActive ? "bg-emerald-400" : "bg-rose-400"
              }`}
            />
            {isActive ? "Active" : "Inactive"}
          </span>
        </div>

        <div className="mt-5 grid gap-4 border-t border-slate-800/70 pt-5 text-sm sm:grid-cols-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
              Created
            </p>
            <p className="mt-1 font-bold text-slate-200">
              {formatDate(project.createdAt)}
            </p>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
              Description
            </p>
            <p className="mt-1 truncate font-bold text-slate-200" title={project.description ?? undefined}>
              {project.description || "No description"}
            </p>
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
              Project ID
            </p>
            <p className="mt-1 truncate font-mono text-xs text-slate-300" title={project.id}>
              {project.id}
            </p>
          </div>
        </div>
      </GlowCard>

      {/* Archived notice */}
      {isArchived ? (
        <div className="mt-4 flex items-start gap-3 rounded-2xl border border-amber-400/25 bg-amber-500/10 px-5 py-4">
          <Icon name="clock" className="mt-0.5 size-5 shrink-0 text-amber-300" />
          <div>
            <p className="text-sm font-black text-amber-200">
              Event ingestion is paused for this project.
            </p>
            <p className="mt-0.5 text-sm text-slate-300">
              Existing events and API keys are kept.{" "}
              <Link
                className="font-bold text-amber-200 underline hover:text-amber-100"
                href={`/dashboard/projects/${project.id}/settings`}
              >
                Restore the project
              </Link>{" "}
              to resume ingestion.
            </p>
          </div>
        </div>
      ) : null}

      {/* Summary cards */}
      <section className="mt-4 grid gap-4 md:grid-cols-3">
        {summaryCards.map((card) => (
          <GlowCard className="p-5" key={card.label}>
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-400">
                  {card.label}
                </p>
                <p className="mt-3 text-3xl font-black tracking-tight text-white">
                  {card.value}
                </p>
                <p className="mt-2 text-sm text-slate-500">{card.detail}</p>
              </div>
              <div
                className={`flex size-12 shrink-0 items-center justify-center rounded-full border ${card.boxClassName} ${card.tone}`}
              >
                <Icon name={card.icon} />
              </div>
            </div>
          </GlowCard>
        ))}
      </section>

      {/* Ingestion guide */}
      <GlowCard className="mt-4 p-6">
        <div className="flex items-center gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-full border border-cyan-400/25 bg-cyan-500/10 text-cyan-400">
            <Icon name="bolt" className="size-5" />
          </div>
          <div>
            <h2 className="text-lg font-black text-white">
              Send your first event
            </h2>
            <p className="text-sm text-slate-400">
              Ingest events from your app using an API key for this project.
            </p>
          </div>
        </div>

        {isArchived ? (
          <div className="mt-5 rounded-xl border border-amber-400/25 bg-amber-500/10 px-4 py-3 text-sm font-bold text-amber-200">
            Restore this project before sending events.
          </div>
        ) : !hasActiveKey ? (
          <div className="mt-5 rounded-xl border border-slate-700/70 bg-slate-950/40 px-4 py-3 text-sm text-slate-300">
            Create an API key to start sending events.{" "}
            <Link
              className="font-bold text-cyan-300 hover:text-cyan-200"
              href="/dashboard/api-keys"
            >
              Create API key →
            </Link>
          </div>
        ) : (
          <div className="mt-5 grid gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                Endpoint
              </p>
              <div className="mt-2 flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-950/80 px-4 py-3">
                <code className="min-w-0 flex-1 truncate font-mono text-xs text-cyan-100">
                  POST {ingestEndpoint}
                </code>
                <button
                  className="shrink-0 rounded-lg border border-slate-700/80 bg-slate-950/50 px-3 py-1.5 text-xs font-black text-cyan-300 transition hover:border-cyan-300/35"
                  onClick={() => copy("endpoint", ingestEndpoint)}
                  type="button"
                >
                  {copied === "endpoint" ? "Copied!" : "Copy"}
                </button>
              </div>
            </div>

            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                Auth header (use one)
              </p>
              <pre className="mt-2 overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/80 p-4 font-mono text-xs text-slate-300">
                {`Authorization: Bearer <API_KEY>\nx-api-key: <API_KEY>`}
              </pre>
            </div>

            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                Request body
              </p>
              <pre className="mt-2 overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/80 p-4 font-mono text-xs text-cyan-100">
                {sampleBody}
              </pre>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                  Example (curl)
                </p>
                <button
                  className="rounded-lg border border-slate-700/80 bg-slate-950/50 px-3 py-1.5 text-xs font-black text-cyan-300 transition hover:border-cyan-300/35"
                  onClick={() => copy("curl", sampleCurl)}
                  type="button"
                >
                  {copied === "curl" ? "Copied!" : "Copy curl"}
                </button>
              </div>
              <pre className="mt-2 overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/80 p-4 font-mono text-xs text-slate-300">
                {sampleCurl}
              </pre>
            </div>

            <p className="text-xs text-slate-500">
              Replace the placeholder with an API key from this project. For
              security, EventPulse shows a key&apos;s full value only once, at
              creation time.
            </p>
          </div>
        )}
      </GlowCard>

      {/* API keys for this project */}
      <GlowCard className="mt-4 overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-800/70 px-5 py-4">
          <div>
            <h2 className="text-lg font-black text-white">API Keys</h2>
            {isArchived && apiKeys.length > 0 ? (
              <p className="mt-0.5 text-xs font-bold text-amber-300/90">
                Ingestion is blocked for these keys while the project is
                archived.
              </p>
            ) : null}
          </div>
          <Link
            className="text-sm font-bold text-cyan-300 hover:text-cyan-200"
            href="/dashboard/api-keys"
          >
            Manage →
          </Link>
        </div>
        {apiKeys.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-5 py-10 text-center">
            <Icon className="size-8 text-slate-600" name="key" />
            <p className="text-sm text-slate-500">No API keys yet.</p>
          </div>
        ) : (
          <>
            <div className="hidden grid-cols-[1.3fr_1.3fr_0.8fr_0.9fr_0.9fr] px-5 py-3 text-xs font-bold uppercase tracking-wide text-slate-500 lg:grid">
              <span>Name</span>
              <span>Masked Key</span>
              <span>Status</span>
              <span>Last Used</span>
              <span>Created</span>
            </div>
            {apiKeys.map((key) => (
              <div
                className="grid gap-2 border-t border-slate-800/70 px-5 py-4 text-sm lg:grid-cols-[1.3fr_1.3fr_0.8fr_0.9fr_0.9fr] lg:items-center"
                key={key.id}
              >
                <p className="truncate font-black text-white" title={key.name}>
                  {key.name}
                </p>
                <p className="truncate font-mono text-xs text-slate-300" title={key.maskedKey}>
                  {key.maskedKey}
                </p>
                <div>
                  <span
                    className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-black ${
                      key.status === "ACTIVE"
                        ? "border-emerald-400/20 bg-emerald-500/10 text-emerald-300"
                        : "border-rose-400/20 bg-rose-500/10 text-rose-300"
                    }`}
                  >
                    {key.status === "ACTIVE" ? "Active" : "Revoked"}
                  </span>
                </div>
                <p className="text-slate-400">
                  {key.lastUsedAt ? formatDate(key.lastUsedAt) : "Never used"}
                </p>
                <p className="text-slate-400">{formatDate(key.createdAt)}</p>
              </div>
            ))}
          </>
        )}
      </GlowCard>

      {/* Recent events for this project */}
      <GlowCard className="mt-4 overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-800/70 px-5 py-4">
          <h2 className="text-lg font-black text-white">Recent Events</h2>
          <Link
            className="text-sm font-bold text-cyan-300 hover:text-cyan-200"
            href="/dashboard/events"
          >
            View all →
          </Link>
        </div>
        {events.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-5 py-10 text-center">
            <Icon className="size-8 text-slate-600" name="pulse" />
            <p className="text-sm text-slate-500">No events yet.</p>
          </div>
        ) : (
          events.map((event) => {
            const hasProps = Object.keys(event.properties).length > 0;
            return (
              <div
                className="border-t border-slate-800/70 px-5 py-4 text-sm first:border-t-0"
                key={event.id}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-black text-white">{event.name}</p>
                  <p className="text-xs text-slate-500">
                    {formatDateTime(event.createdAt)}
                  </p>
                </div>
                <p className="mt-1 truncate font-mono text-xs text-slate-500" title={event.id}>
                  {event.id}
                </p>
                {hasProps ? (
                  <p className="mt-2 truncate font-mono text-xs text-slate-400" title={JSON.stringify(event.properties)}>
                    {JSON.stringify(event.properties)}
                  </p>
                ) : null}
              </div>
            );
          })
        )}
      </GlowCard>
    </div>
  );
}
