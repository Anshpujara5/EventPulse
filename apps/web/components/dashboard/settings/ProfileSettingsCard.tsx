"use client";

import { GlowCard } from "@/components/common/GlowCard";
import { Icon } from "@/components/common/Icon";
import { API_BASE, getAuthHeaders, getJsonAuthHeaders } from "@/lib/api";
import { useEffect, useRef, useState } from "react";

type SaveStatus = "idle" | "saving" | "saved" | "error";

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return (parts[0] ?? "").slice(0, 2).toUpperCase();
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase();
}

export function ProfileSettingsCard() {
  const [savedName, setSavedName] = useState("Ansh Pujara");
  const [savedEmail, setSavedEmail] = useState("ansh@example.com");
  const [draftName, setDraftName] = useState("Ansh Pujara");
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const savedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load real user from API on mount
  useEffect(() => {
    const token = localStorage.getItem("eventpulse_token");
    if (!token) return;

    fetch(`${API_BASE}/api/auth/me`, {
      headers: getAuthHeaders(),
    })
      .then((r) => r.json())
      .then((body: { success: boolean; data?: { user?: { name?: string; email?: string } } }) => {
        if (body.success && body.data?.user) {
          const name = body.data.user.name ?? "Ansh Pujara";
          const email = body.data.user.email ?? "ansh@example.com";
          setSavedName(name);
          setDraftName(name);
          setSavedEmail(email);
        }
      })
      .catch(() => {
        // Silently fall back to defaults
      });
  }, []);

  const isDirty = draftName.trim() !== savedName.trim();

  async function handleSave() {
    const trimmed = draftName.trim();
    if (!isDirty || !trimmed) return;

    setStatus("saving");
    setErrorMsg("");

    try {
      const res = await fetch(`${API_BASE}/api/auth/me`, {
        method: "PATCH",
        headers: getJsonAuthHeaders(),
        body: JSON.stringify({ name: trimmed }),
      });

      const body = (await res.json()) as { success: boolean; message?: string; data?: { user?: { name?: string } } };

      if (body.success) {
        const newName = body.data?.user?.name ?? trimmed;
        setSavedName(newName);
        setDraftName(newName);
        setStatus("saved");
        if (savedTimer.current) clearTimeout(savedTimer.current);
        savedTimer.current = setTimeout(() => setStatus("idle"), 2500);
      } else {
        setErrorMsg(body.message ?? "Update failed. Please try again.");
        setStatus("error");
      }
    } catch {
      setErrorMsg("Network error. Please try again.");
      setStatus("error");
    }
  }

  return (
    <GlowCard className="flex flex-col">
      {/* Card header */}
      <div className="flex items-center gap-2.5 border-b border-slate-800/60 px-5 py-4">
        <div className="flex size-7 items-center justify-center rounded-lg bg-cyan-500/10 text-cyan-400 ring-1 ring-cyan-400/20">
          <Icon className="size-3.5" name="user" />
        </div>
        <span className="text-sm font-bold text-white">Profile</span>
        <span className="ml-auto rounded-full border border-slate-700/60 bg-slate-800/50 px-2 py-0.5 text-[10px] font-semibold text-slate-500">
          preview
        </span>
      </div>

      <div className="flex flex-1 flex-col p-5">
        {/* Avatar hero */}
        <div className="mb-5 flex items-center gap-4 rounded-xl border border-slate-800/60 bg-gradient-to-r from-slate-900/60 to-slate-900/20 px-4 py-3.5">
          <div className="relative flex size-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-violet-600 text-base font-black text-white shadow-[0_0_20px_rgba(79,70,229,0.35)] ring-2 ring-white/10">
            {getInitials(savedName)}
            <span className="absolute bottom-0 right-0 size-3 rounded-full bg-emerald-400 ring-2 ring-[#071426]" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-white">{savedName}</p>
            <span className="mt-1 inline-flex items-center rounded-full border border-violet-400/20 bg-violet-500/10 px-2 py-0.5 text-[10px] font-semibold text-violet-300">
              Workspace Admin
            </span>
          </div>
        </div>

        {/* Fields */}
        <div className="grid gap-4 sm:grid-cols-2">
          {/* Full Name — editable */}
          <div>
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-slate-500">
              Full Name
            </p>
            <div className="flex items-center border-b border-slate-800/70 pb-2 focus-within:border-blue-500/40">
              <input
                className="w-full bg-transparent text-sm font-medium text-slate-200 outline-none placeholder:text-slate-600 focus:text-white"
                onChange={(e) => {
                  setDraftName(e.target.value);
                  if (status === "error") setStatus("idle");
                }}
                placeholder="Your name"
                type="text"
                value={draftName}
              />
            </div>
          </div>

          {/* Email — read-only */}
          <div>
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-slate-500">
              Email Address
            </p>
            <div className="flex items-center justify-between border-b border-slate-800/70 pb-2">
              <span className="text-sm font-medium text-slate-400">{savedEmail}</span>
            </div>
          </div>

          {/* Role — read-only */}
          <div className="sm:col-span-2">
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-slate-500">
              Role
            </p>
            <div className="flex items-center justify-between border-b border-slate-800/70 pb-2">
              <span className="text-sm font-medium text-slate-400">Workspace Admin</span>
              <span className="text-[10px] text-slate-600">Read-only</span>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="mt-auto pt-5">
          <div className="mb-2 h-4">
            {status === "saved" && (
              <p className="text-center text-[11px] font-medium text-emerald-400">
                Profile updated.
              </p>
            )}
            {status === "error" && (
              <p className="text-center text-[11px] font-medium text-red-400">{errorMsg}</p>
            )}
          </div>
          <button
            className="h-8 w-full rounded-lg bg-gradient-to-r from-blue-600 to-violet-600 text-xs font-bold text-white shadow-[0_0_16px_rgba(79,70,229,0.18)] transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
            disabled={!isDirty || status === "saving"}
            onClick={handleSave}
            type="button"
          >
            {status === "saving" ? "Saving…" : "Update Profile"}
          </button>
        </div>
      </div>
    </GlowCard>
  );
}
