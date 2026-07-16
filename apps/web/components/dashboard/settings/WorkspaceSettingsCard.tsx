"use client";

import { GlowCard } from "@/components/common/GlowCard";
import { Icon } from "@/components/common/Icon";
import { useEffect, useRef, useState } from "react";

interface WorkspaceValues {
  workspaceName: string;
  workspaceUrl: string;
  defaultProject: string;
  dataRegion: string;
}

// Empty starting defaults — user fills these in locally
const EMPTY_DEFAULTS: WorkspaceValues = {
  workspaceName: "",
  workspaceUrl: "",
  defaultProject: "",
  dataRegion: "",
};

const STORAGE_KEY = "ep_workspace_settings";
const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:5001";

type SaveStatus = "idle" | "saving" | "saved";

function loadFromStorage(): WorkspaceValues | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<WorkspaceValues>;
    return {
      workspaceName: parsed.workspaceName ?? "",
      workspaceUrl: parsed.workspaceUrl ?? "",
      defaultProject: parsed.defaultProject ?? "",
      dataRegion: parsed.dataRegion ?? "",
    };
  } catch {
    return null;
  }
}

function valuesEqual(a: WorkspaceValues, b: WorkspaceValues) {
  return (
    a.workspaceName === b.workspaceName &&
    a.workspaceUrl === b.workspaceUrl &&
    a.defaultProject === b.defaultProject &&
    a.dataRegion === b.dataRegion
  );
}

interface FieldConfig {
  key: keyof WorkspaceValues;
  label: string;
  placeholder: string;
  icon?: true;
}

const FIELDS: FieldConfig[] = [
  { key: "workspaceName", label: "Workspace Name", placeholder: "e.g. My Company" },
  { key: "workspaceUrl", label: "Workspace URL", placeholder: "e.g. myapp.com/dashboard" },
  { key: "defaultProject", label: "Default Project", placeholder: "Select a project…", icon: true },
  { key: "dataRegion", label: "Data Region", placeholder: "e.g. US East, EU West", icon: true },
];

export function WorkspaceSettingsCard() {
  const [initialValues] = useState<WorkspaceValues>(
    () => loadFromStorage() ?? EMPTY_DEFAULTS,
  );
  const [saved, setSaved] = useState<WorkspaceValues>(initialValues);
  const [draft, setDraft] = useState<WorkspaceValues>(initialValues);
  const [status, setStatus] = useState<SaveStatus>("idle");
  const savedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // If defaultProject is not already saved, seed from the real projects API.
    if (!initialValues.defaultProject) {
      const token = localStorage.getItem("eventpulse_token");
      if (!token) return;

      fetch(`${API_BASE}/api/projects`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((r) => r.json())
        .then(
          (body: {
            success: boolean;
            data?: { projects?: Array<{ name: string; status: string }> };
          }) => {
            if (body.success && body.data?.projects?.length) {
              const first =
                body.data.projects.find((p) => p.status === "ACTIVE") ??
                body.data.projects[0];
              if (first) {
                // Only pre-fill the draft (not saved) — user must still click Save to persist
                setDraft((prev) => ({ ...prev, defaultProject: first.name }));
              }
            }
          },
        )
        .catch(() => {
          // Silently ignore — field stays empty
        });
    }
  }, [initialValues.defaultProject]);

  const isDirty = !valuesEqual(draft, saved);

  function setField(key: keyof WorkspaceValues, value: string) {
    setDraft((prev) => ({ ...prev, [key]: value }));
  }

  function handleSave() {
    if (!isDirty) return;
    setStatus("saving");
    setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
        setSaved({ ...draft });
        setStatus("saved");
        if (savedTimer.current) clearTimeout(savedTimer.current);
        savedTimer.current = setTimeout(() => setStatus("idle"), 2500);
      } catch {
        setStatus("idle");
      }
    }, 400);
  }

  function handleReset() {
    setDraft({ ...EMPTY_DEFAULTS });
    setSaved(EMPTY_DEFAULTS);
    localStorage.removeItem(STORAGE_KEY);
  }

  return (
    <GlowCard className="flex flex-col">
      {/* Card header */}
      <div className="flex items-center gap-2.5 border-b border-slate-800/60 px-5 py-4">
        <div className="flex size-7 items-center justify-center rounded-lg bg-blue-500/10 text-blue-400 ring-1 ring-blue-400/20">
          <Icon className="size-3.5" name="database" />
        </div>
        <span className="text-sm font-bold text-white">Workspace</span>
        <span className="ml-auto rounded-full border border-slate-700/60 bg-slate-800/50 px-2 py-0.5 text-[10px] font-semibold text-slate-500">
          local preview
        </span>
      </div>

      <div className="flex flex-1 flex-col p-5">
        {/* Field grid */}
        <div className="grid gap-4 sm:grid-cols-2">
          {FIELDS.map((field) => (
            <div key={field.key}>
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-slate-500">
                {field.label}
              </p>
              <div className="flex items-center border-b border-slate-800/70 pb-2 focus-within:border-blue-500/40">
                <input
                  className="min-w-0 flex-1 bg-transparent text-sm font-medium text-slate-200 outline-none placeholder:text-slate-600 focus:text-white"
                  onChange={(e) => setField(field.key, e.target.value)}
                  placeholder={field.placeholder}
                  type="text"
                  value={draft[field.key]}
                />
                {field.icon && (
                  <Icon className="ml-2 size-3.5 shrink-0 text-slate-600" name="list" />
                )}
              </div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="mt-auto pt-5">
          <div className="mb-2 h-4">
            {status === "saved" && (
              <p className="text-center text-[11px] font-medium text-emerald-400">
                Saved locally — not synced to server.
              </p>
            )}
          </div>
          <div className="flex items-center gap-2.5">
            <button
              className="h-8 flex-1 rounded-lg bg-gradient-to-r from-blue-600 to-violet-600 text-xs font-bold text-white shadow-[0_0_16px_rgba(79,70,229,0.18)] transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
              disabled={!isDirty || status === "saving"}
              onClick={handleSave}
              type="button"
            >
              {status === "saving" ? "Saving…" : "Save Changes"}
            </button>
            <button
              className="h-8 rounded-lg border border-slate-700/70 bg-slate-900/60 px-4 text-xs font-semibold text-slate-400 transition hover:border-slate-600 hover:text-slate-200"
              onClick={handleReset}
              type="button"
            >
              Reset
            </button>
          </div>
        </div>
      </div>
    </GlowCard>
  );
}
