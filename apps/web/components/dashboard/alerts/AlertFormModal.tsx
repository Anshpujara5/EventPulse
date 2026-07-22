"use client";

import type {
  Project,
  ProjectsResponse,
} from "@/components/dashboard/api-keys/api-key-types";
import { apiRequest, getAuthHeaders } from "@/lib/api";
import { FormEvent, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import type { Alert, AlertMutationResponse } from "./alert-types";

interface AlertFormValues {
  projectId: string;
  name: string;
  eventName: string;
  threshold: string;
  windowMinutes: string;
}

const emptyForm: AlertFormValues = {
  projectId: "",
  name: "",
  eventName: "",
  threshold: "",
  windowMinutes: "",
};

function positiveInt(value: string): number | null {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

/**
 * Real Create/Edit Alert modal, backed by POST/PATCH /api/alerts. Shared by
 * the Alerts page and the header "Create Alert" button so there is a single
 * source of truth for validation and submission — the caller decides what
 * happens after a save (update a local list vs. navigate to /dashboard/alerts).
 */
export function AlertFormModal({
  alert,
  onClose,
  onSaved,
}: {
  alert?: Alert;
  onClose: () => void;
  onSaved: (alert: Alert) => void;
}) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [form, setForm] = useState<AlertFormValues>(
    alert
      ? {
          projectId: alert.projectId,
          name: alert.name,
          eventName: alert.eventName,
          threshold: String(alert.threshold),
          windowMinutes: String(alert.windowMinutes),
        }
      : emptyForm,
  );
  const [formError, setFormError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let isActive = true;

    apiRequest<ProjectsResponse>("/api/projects", { headers: getAuthHeaders() })
      .then((res) => {
        if (isActive) {
          setProjects(res.data.projects);
        }
      })
      .catch(() => {
        // Modal still works; the project dropdown just stays empty.
      });

    return () => {
      isActive = false;
    };
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError("");

    if (!form.projectId) {
      setFormError("Select a project.");
      return;
    }
    if (!form.name.trim()) {
      setFormError("Alert name is required.");
      return;
    }
    if (!form.eventName.trim()) {
      setFormError("Event name is required.");
      return;
    }
    const threshold = positiveInt(form.threshold);
    if (threshold === null) {
      setFormError("Threshold must be a positive whole number.");
      return;
    }
    const windowMinutes = positiveInt(form.windowMinutes);
    if (windowMinutes === null) {
      setFormError("Window (minutes) must be a positive whole number.");
      return;
    }

    const body = JSON.stringify({
      projectId: form.projectId,
      name: form.name.trim(),
      eventName: form.eventName.trim(),
      threshold,
      windowMinutes,
    });

    try {
      setIsSubmitting(true);
      const res = alert
        ? await apiRequest<AlertMutationResponse>(`/api/alerts/${alert.id}`, {
            method: "PATCH",
            headers: getAuthHeaders(),
            body,
          })
        : await apiRequest<AlertMutationResponse>("/api/alerts", {
            method: "POST",
            headers: getAuthHeaders(),
            body,
          });
      onSaved(res.data.alert);
    } catch (requestError) {
      setFormError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to save alert",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  if (typeof document === "undefined") {
    return null;
  }

  // Rendered through a portal so a `fixed inset-0` backdrop always covers the
  // full viewport. Without this, invoking the modal from the header (which
  // uses backdrop-blur — a CSS property that establishes a new containing
  // block for fixed-position descendants) would confine the modal to the
  // header's own small box instead of the viewport.
  return createPortal(
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/75 backdrop-blur-sm">
      <div className="flex min-h-full items-center justify-center px-4 py-8">
        <form
          className="flex max-h-[calc(100vh-4rem)] w-full max-w-xl flex-col rounded-2xl border border-slate-700/80 bg-[#071426]/98 shadow-[0_24px_70px_rgba(0,0,0,0.5)]"
          onSubmit={handleSubmit}
        >
          {/* Header stays pinned so it's never cut off by scroll. */}
          <div className="flex shrink-0 items-start justify-between gap-4 border-b border-slate-800/70 p-6 pb-5">
            <div>
              <h2 className="text-xl font-black text-white">
                {alert ? "Edit Alert" : "Create Alert"}
              </h2>
              <p className="mt-1 text-sm text-slate-400">
                Trigger when an event fires at least the threshold number of
                times within the window.
              </p>
            </div>
            <button
              aria-label="Close"
              className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-slate-700/80 bg-slate-950/50 text-slate-400 hover:text-white"
              onClick={onClose}
              type="button"
            >
              ×
            </button>
          </div>

          {/* Body scrolls internally on short viewports; header/footer don't. */}
          <div className="min-h-0 flex-1 overflow-y-auto p-6">
            <label className="block text-sm font-bold text-slate-300">
              Project
              <select
                className="mt-2 h-12 w-full rounded-xl border border-slate-700/80 bg-slate-950/60 px-4 text-sm text-white outline-none focus:border-cyan-400/70"
                disabled={projects.length === 0}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    projectId: event.target.value,
                  }))
                }
                value={form.projectId}
              >
                <option value="">
                  {projects.length === 0
                    ? "Create a project first"
                    : "Select project"}
                </option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="mt-4 block text-sm font-bold text-slate-300">
              Alert name
              <input
                className="mt-2 h-12 w-full rounded-xl border border-slate-700/80 bg-slate-950/60 px-4 text-sm text-white outline-none placeholder:text-slate-500 focus:border-cyan-400/70"
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    name: event.target.value,
                  }))
                }
                placeholder="Payment failures spike"
                value={form.name}
              />
            </label>

            <label className="mt-4 block text-sm font-bold text-slate-300">
              Event name
              <input
                className="mt-2 h-12 w-full rounded-xl border border-slate-700/80 bg-slate-950/60 px-4 font-mono text-sm text-white outline-none placeholder:text-slate-500 focus:border-cyan-400/70"
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    eventName: event.target.value,
                  }))
                }
                placeholder="payment_failed"
                value={form.eventName}
              />
              <span className="mt-1.5 block text-xs font-normal text-slate-500">
                e.g. payment_failed, item_out_of_stock, checkout_started,
                purchase_completed, delivery_fee_shown
              </span>
            </label>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <label className="block text-sm font-bold text-slate-300">
                Threshold (count)
                <input
                  className="mt-2 h-12 w-full rounded-xl border border-slate-700/80 bg-slate-950/60 px-4 text-sm text-white outline-none placeholder:text-slate-500 focus:border-cyan-400/70"
                  inputMode="numeric"
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      threshold: event.target.value,
                    }))
                  }
                  placeholder="100"
                  value={form.threshold}
                />
              </label>
              <label className="block text-sm font-bold text-slate-300">
                Window (minutes)
                <input
                  className="mt-2 h-12 w-full rounded-xl border border-slate-700/80 bg-slate-950/60 px-4 text-sm text-white outline-none placeholder:text-slate-500 focus:border-cyan-400/70"
                  inputMode="numeric"
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      windowMinutes: event.target.value,
                    }))
                  }
                  placeholder="60"
                  value={form.windowMinutes}
                />
              </label>
            </div>

            {formError ? (
              <p className="mt-4 rounded-xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm font-bold text-rose-300">
                {formError}
              </p>
            ) : null}
          </div>

          {/* Footer stays pinned so Cancel/Create are always visible. */}
          <div className="flex shrink-0 justify-end gap-3 border-t border-slate-800/70 p-6 pt-5">
            <button
              className="h-11 rounded-xl border border-slate-700/80 bg-slate-950/50 px-5 text-sm font-bold text-slate-300"
              onClick={onClose}
              type="button"
            >
              Cancel
            </button>
            <button
              className="h-11 rounded-xl bg-linear-to-r from-blue-600 to-violet-600 px-5 text-sm font-black text-white shadow-[0_0_24px_rgba(79,70,229,0.25)] disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isSubmitting || projects.length === 0}
              type="submit"
            >
              {isSubmitting
                ? "Saving..."
                : alert
                  ? "Save changes"
                  : "Create Alert"}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
}
