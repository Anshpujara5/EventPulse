"use client";

import { GlowCard } from "@/components/common/GlowCard";
import { Icon } from "@/components/common/Icon";
import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";
import type { Project } from "./ProjectCard";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:5001";

type LoadStatus = "loading" | "notFound" | "error" | "success";
type SaveStatus = "idle" | "saving" | "saved" | "error";
type ProjectStatus = "ACTIVE" | "INACTIVE";

interface FormValues {
  name: string;
  domain: string;
  status: ProjectStatus;
  description: string;
}

function authHeaders(): Record<string, string> {
  const token =
    typeof window !== "undefined"
      ? localStorage.getItem("eventpulse_token")
      : null;
  return { Authorization: `Bearer ${token ?? ""}` };
}

export function ProjectSettings({ projectId }: { projectId: string }) {
  const [loadStatus, setLoadStatus] = useState<LoadStatus>("loading");
  const [loadError, setLoadError] = useState("");
  const [form, setForm] = useState<FormValues>({
    name: "",
    domain: "",
    status: "ACTIVE",
    description: "",
  });
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [saveError, setSaveError] = useState("");
  // Persisted (server) status drives the Danger Zone; the form's status select
  // is a separate direct edit and may differ until saved.
  const [persistedStatus, setPersistedStatus] = useState<ProjectStatus>("ACTIVE");
  const [confirmAction, setConfirmAction] = useState<"archive" | "restore" | null>(
    null,
  );
  const [lifecycleStatus, setLifecycleStatus] = useState<SaveStatus>("idle");
  const [lifecycleError, setLifecycleError] = useState("");

  const load = useCallback(async () => {
    setLoadStatus("loading");
    setLoadError("");

    try {
      const res = await fetch(`${API_BASE}/api/projects/${projectId}`, {
        headers: authHeaders(),
      });

      if (res.status === 404) {
        setLoadStatus("notFound");
        return;
      }

      if (!res.ok) {
        const body = (await res.json()) as { message?: string };
        setLoadError(body.message ?? "Failed to load project");
        setLoadStatus("error");
        return;
      }

      const body = (await res.json()) as { data: { project: Project } };
      const project = body.data.project;
      setForm({
        name: project.name,
        domain: project.domain,
        status: project.status,
        description: project.description ?? "",
      });
      setPersistedStatus(project.status);
      setLoadStatus("success");
    } catch {
      setLoadError("Could not reach server");
      setLoadStatus("error");
    }
  }, [projectId]);

  useEffect(() => {
    void load();
  }, [load]);

  function setField<K extends keyof FormValues>(key: K, value: FormValues[K]) {
    setForm((current) => ({ ...current, [key]: value }));
    if (saveStatus !== "idle") {
      setSaveStatus("idle");
    }
  }

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaveError("");

    if (!form.name.trim()) {
      setSaveError("Project name is required.");
      setSaveStatus("error");
      return;
    }

    if (!form.domain.trim()) {
      setSaveError("Domain is required.");
      setSaveStatus("error");
      return;
    }

    setSaveStatus("saving");

    try {
      const res = await fetch(`${API_BASE}/api/projects/${projectId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders(),
        },
        body: JSON.stringify({
          name: form.name.trim(),
          domain: form.domain.trim(),
          status: form.status,
          description: form.description.trim(),
        }),
      });

      const body = (await res.json()) as {
        success: boolean;
        message?: string;
        data?: { project: Project };
      };

      if (!res.ok || !body.success || !body.data) {
        setSaveError(body.message ?? "Failed to update project.");
        setSaveStatus("error");
        return;
      }

      const project = body.data.project;
      setForm({
        name: project.name,
        domain: project.domain,
        status: project.status,
        description: project.description ?? "",
      });
      setPersistedStatus(project.status);
      setSaveStatus("saved");
    } catch {
      setSaveError("Could not reach server.");
      setSaveStatus("error");
    }
  }

  async function runLifecycle(action: "archive" | "restore") {
    setLifecycleStatus("saving");
    setLifecycleError("");

    try {
      const res = await fetch(
        `${API_BASE}/api/projects/${projectId}/${action}`,
        {
          method: "PATCH",
          headers: authHeaders(),
        },
      );

      const body = (await res.json()) as {
        success: boolean;
        message?: string;
        data?: { project: Project };
      };

      if (!res.ok || !body.success || !body.data) {
        setLifecycleError(
          body.message ?? `Failed to ${action} project.`,
        );
        setLifecycleStatus("error");
        return;
      }

      const project = body.data.project;
      setPersistedStatus(project.status);
      setForm((current) => ({ ...current, status: project.status }));
      setConfirmAction(null);
      setLifecycleStatus("saved");
    } catch {
      setLifecycleError("Could not reach server.");
      setLifecycleStatus("error");
    }
  }

  const backToProjects = (
    <Link
      className="inline-flex items-center gap-2 text-sm font-bold text-slate-400 transition hover:text-cyan-300"
      href="/dashboard/projects"
    >
      <span aria-hidden>←</span> Projects
    </Link>
  );

  const isArchived = persistedStatus === "INACTIVE";

  if (loadStatus === "loading") {
    return (
      <div className="mx-auto max-w-[820px] px-4 py-5 sm:px-6">
        {backToProjects}
        <div className="mt-6 flex h-64 items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="size-8 animate-spin rounded-full border-2 border-slate-700 border-t-cyan-400" />
            <p className="text-sm text-slate-500">Loading project…</p>
          </div>
        </div>
      </div>
    );
  }

  if (loadStatus === "notFound") {
    return (
      <div className="mx-auto max-w-[820px] px-4 py-5 sm:px-6">
        {backToProjects}
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

  if (loadStatus === "error") {
    return (
      <div className="mx-auto max-w-[820px] px-4 py-5 sm:px-6">
        {backToProjects}
        <div className="mt-10 flex flex-col items-center gap-4 text-center">
          <p className="text-rose-400">{loadError || "Failed to load project"}</p>
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

  return (
    <div className="mx-auto max-w-[820px] px-4 py-5 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {backToProjects}
        <Link
          className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-700/80 bg-slate-950/40 px-4 text-sm font-bold text-slate-300 transition hover:border-cyan-300/35 hover:text-cyan-300"
          href={`/dashboard/projects/${projectId}`}
        >
          <Icon name="cube" className="size-4" />
          View project
        </Link>
      </div>

      <div className="mt-4">
        <h1 className="text-3xl font-black tracking-tight">Project Settings</h1>
        <p className="mt-1 text-sm text-slate-400">
          Update this project&apos;s details. Changes persist to your workspace.
        </p>
      </div>

      <GlowCard className="mt-4 p-6">
        <form onSubmit={handleSave}>
          <label className="block text-sm font-bold text-slate-300">
            Project name
            <input
              className="mt-2 h-12 w-full rounded-xl border border-slate-700/80 bg-slate-950/60 px-4 text-sm text-white outline-none placeholder:text-slate-500 focus:border-cyan-400/70"
              onChange={(event) => setField("name", event.target.value)}
              placeholder="Production App"
              value={form.name}
            />
          </label>

          <label className="mt-4 block text-sm font-bold text-slate-300">
            Domain
            <input
              className="mt-2 h-12 w-full rounded-xl border border-slate-700/80 bg-slate-950/60 px-4 text-sm text-white outline-none placeholder:text-slate-500 focus:border-cyan-400/70"
              onChange={(event) => setField("domain", event.target.value)}
              placeholder="app.example.com"
              value={form.domain}
            />
          </label>

          <label className="mt-4 block text-sm font-bold text-slate-300">
            Status
            <select
              className="mt-2 h-12 w-full rounded-xl border border-slate-700/80 bg-slate-950/60 px-4 text-sm text-white outline-none focus:border-cyan-400/70"
              onChange={(event) =>
                setField("status", event.target.value as ProjectStatus)
              }
              value={form.status}
            >
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
            </select>
          </label>

          <label className="mt-4 block text-sm font-bold text-slate-300">
            Description
            <textarea
              className="mt-2 min-h-28 w-full resize-none rounded-xl border border-slate-700/80 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-cyan-400/70"
              onChange={(event) => setField("description", event.target.value)}
              placeholder="Tracks product events for the main application."
              value={form.description}
            />
          </label>

          {saveStatus === "saved" ? (
            <p className="mt-4 rounded-xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 text-sm font-bold text-emerald-300">
              Project updated successfully.
            </p>
          ) : null}
          {saveStatus === "error" ? (
            <p className="mt-4 rounded-xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm font-bold text-rose-300">
              {saveError}
            </p>
          ) : null}

          <div className="mt-6 flex justify-end">
            <button
              className="h-11 rounded-xl bg-linear-to-r from-blue-600 to-violet-600 px-5 text-sm font-black text-white shadow-[0_0_24px_rgba(79,70,229,0.25)] disabled:cursor-not-allowed disabled:opacity-60"
              disabled={saveStatus === "saving"}
              type="submit"
            >
              {saveStatus === "saving" ? "Saving..." : "Save changes"}
            </button>
          </div>
        </form>
      </GlowCard>

      {/* Danger zone — archive/restore (non-destructive status flip) */}
      <GlowCard className="mt-4 border-rose-500/25 p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-black text-rose-200">Danger zone</h2>
            {isArchived ? (
              <p className="mt-1 text-sm text-slate-400">
                This project is archived. Event ingestion is paused. Restoring
                it resumes ingestion for its API keys.
              </p>
            ) : (
              <p className="mt-1 text-sm text-slate-400">
                Archiving pauses event ingestion for this project. Existing
                events and API keys are kept.
              </p>
            )}
          </div>
          {isArchived ? (
            <button
              className="h-11 shrink-0 rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-5 text-sm font-black text-emerald-300 transition hover:bg-emerald-500/15"
              onClick={() => {
                setLifecycleStatus("idle");
                setLifecycleError("");
                setConfirmAction("restore");
              }}
              type="button"
            >
              Restore Project
            </button>
          ) : (
            <button
              className="h-11 shrink-0 rounded-xl border border-rose-500/30 bg-rose-500/10 px-5 text-sm font-black text-rose-300 transition hover:bg-rose-500/15"
              onClick={() => {
                setLifecycleStatus("idle");
                setLifecycleError("");
                setConfirmAction("archive");
              }}
              type="button"
            >
              Archive Project
            </button>
          )}
        </div>
        {lifecycleStatus === "saved" && !confirmAction ? (
          <p className="mt-4 rounded-xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 text-sm font-bold text-emerald-300">
            {isArchived
              ? "Project archived. Event ingestion is paused."
              : "Project restored. Event ingestion is active again."}
          </p>
        ) : null}
      </GlowCard>

      {confirmAction ? (
        <div
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 px-4 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (
              event.target === event.currentTarget &&
              lifecycleStatus !== "saving"
            ) {
              setConfirmAction(null);
            }
          }}
          role="dialog"
        >
          <div className="w-full max-w-md rounded-2xl border border-slate-700/80 bg-[#071426]/98 p-6 shadow-[0_24px_70px_rgba(0,0,0,0.5)]">
            <h2 className="text-xl font-black text-white">
              {confirmAction === "archive"
                ? "Archive this project?"
                : "Restore this project?"}
            </h2>

            {confirmAction === "archive" ? (
              <ul className="mt-4 space-y-2 text-sm text-slate-300">
                <li className="flex gap-2">
                  <span className="text-rose-300">•</span>
                  New event ingestion will stop for this project.
                </li>
                <li className="flex gap-2">
                  <span className="text-emerald-300">•</span>
                  Existing events and API keys will not be deleted.
                </li>
              </ul>
            ) : (
              <p className="mt-4 text-sm text-slate-300">
                Event ingestion will resume for this project&apos;s active API
                keys.
              </p>
            )}

            {lifecycleStatus === "error" ? (
              <p className="mt-4 rounded-xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm font-bold text-rose-300">
                {lifecycleError}
              </p>
            ) : null}

            <div className="mt-6 flex justify-end gap-3">
              <button
                className="h-11 rounded-xl border border-slate-700/80 bg-slate-950/50 px-5 text-sm font-bold text-slate-300 disabled:opacity-60"
                disabled={lifecycleStatus === "saving"}
                onClick={() => setConfirmAction(null)}
                type="button"
              >
                Cancel
              </button>
              <button
                className={`h-11 rounded-xl px-5 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-60 ${
                  confirmAction === "archive"
                    ? "bg-rose-600 hover:bg-rose-500"
                    : "bg-emerald-600 hover:bg-emerald-500"
                }`}
                disabled={lifecycleStatus === "saving"}
                onClick={() => void runLifecycle(confirmAction)}
                type="button"
              >
                {lifecycleStatus === "saving"
                  ? "Working..."
                  : confirmAction === "archive"
                    ? "Archive Project"
                    : "Restore Project"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
