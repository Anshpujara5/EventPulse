"use client";

import {
  type FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { apiRequest } from "@/lib/api";
import { ApiKeyDetailsPanel } from "./ApiKeyDetailsPanel";
import {
  ApiKeyMetricCard,
  type ApiKeyMetric,
} from "./ApiKeyMetricCard";
import { ApiKeysFilterBar } from "./ApiKeysFilterBar";
import { ApiKeysTable } from "./ApiKeysTable";
import type {
  ApiKey,
  ApiKeyCreateResponse,
  ApiKeysResponse,
  Project,
  ProjectsResponse,
} from "./api-key-types";
import { SecurityBestPracticesCard } from "./SecurityBestPracticesCard";

type NewApiKey = {
  apiKey: ApiKey;
  rawApiKey: string;
};

const emptyForm = {
  name: "",
  permissions: "Ingest Events",
  projectId: "",
};

function buildMetrics(apiKeys: ApiKey[]): ApiKeyMetric[] {
  const activeKeys = apiKeys.filter((apiKey) => apiKey.status === "ACTIVE");
  const revokedKeys = apiKeys.filter((apiKey) => apiKey.status === "REVOKED");
  const projectsCovered = new Set(apiKeys.map((apiKey) => apiKey.project.id)).size;

  return [
    {
      boxClassName: "border-blue-400/25 bg-blue-500/10",
      deltaContext: "stored securely",
      icon: "key",
      label: "Total Keys",
      negative: false,
      spark: "M4 32 C14 28 17 34 26 25 S39 29 48 18 61 21 74 11 96 8",
      tone: "text-cyan-300",
      value: String(apiKeys.length),
    },
    {
      boxClassName: "border-emerald-400/25 bg-emerald-500/10",
      deltaContext: "ready to use",
      icon: "shield",
      label: "Active Keys",
      negative: false,
      spark: "M4 31 C17 29 24 30 35 23 S52 24 62 17 80 18 96 8",
      tone: "text-emerald-300",
      value: String(activeKeys.length),
    },
    {
      boxClassName: "border-violet-400/25 bg-violet-500/10",
      deltaContext: "linked projects",
      icon: "cube",
      label: "Projects Covered",
      negative: false,
      spark: "M4 34 C18 32 29 25 42 28 S60 22 71 16 84 20 96 10",
      tone: "text-violet-300",
      value: String(projectsCovered),
    },
    {
      boxClassName: "border-rose-400/25 bg-rose-500/10",
      deltaContext: "revoked keys",
      icon: "lock",
      label: "Revoked Keys",
      negative: revokedKeys.length > 0,
      spark: "M4 28 C16 26 22 32 33 25 S48 20 58 26 71 18 96 15",
      tone: "text-rose-300",
      value: String(revokedKeys.length),
    },
  ];
}

export function ApiKeysOverview() {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedApiKeyId, setSelectedApiKeyId] = useState<string>();
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createError, setCreateError] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [newApiKey, setNewApiKey] = useState<NewApiKey | null>(null);

  const getAuthHeaders = useCallback(() => {
    const token = window.localStorage.getItem("eventpulse_token");

    if (!token) {
      throw new Error("You must be signed in to manage API keys");
    }

    return {
      Authorization: `Bearer ${token}`,
    };
  }, []);

  const loadData = useCallback(async () => {
    try {
      setError("");
      setIsLoading(true);
      const headers = getAuthHeaders();
      const [apiKeysResponse, projectsResponse] = await Promise.all([
        apiRequest<ApiKeysResponse>("/api/api-keys", { headers }),
        apiRequest<ProjectsResponse>("/api/projects", { headers }),
      ]);

      setApiKeys(apiKeysResponse.data.apiKeys);
      setProjects(projectsResponse.data.projects);
      setSelectedApiKeyId((currentId) => {
        if (
          currentId &&
          apiKeysResponse.data.apiKeys.some((apiKey) => apiKey.id === currentId)
        ) {
          return currentId;
        }

        return apiKeysResponse.data.apiKeys[0]?.id;
      });
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to load API keys",
      );
    } finally {
      setIsLoading(false);
    }
  }, [getAuthHeaders]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const filteredApiKeys = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    if (!query) {
      return apiKeys;
    }

    return apiKeys.filter((apiKey) =>
      [
        apiKey.name,
        apiKey.project.name,
        apiKey.project.domain,
        apiKey.maskedKey,
        apiKey.permissions,
        apiKey.status,
      ].some((value) => value.toLowerCase().includes(query)),
    );
  }, [apiKeys, searchQuery]);

  const metrics = useMemo(() => buildMetrics(apiKeys), [apiKeys]);
  const selectedApiKey =
    apiKeys.find((apiKey) => apiKey.id === selectedApiKeyId) ?? apiKeys[0];

  const handleOpenCreate = () => {
    setCreateError("");
    setForm((currentForm) => ({
      ...currentForm,
      projectId: currentForm.projectId || projects[0]?.id || "",
    }));
    setIsCreateOpen(true);
  };

  const handleCreateApiKey = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setCreateError("");

    if (!form.name.trim()) {
      setCreateError("API key name is required");
      return;
    }

    if (!form.projectId) {
      setCreateError("Select a project before creating an API key");
      return;
    }

    try {
      setIsCreating(true);
      const response = await apiRequest<ApiKeyCreateResponse>("/api/api-keys", {
        body: JSON.stringify({
          name: form.name,
          permissions: form.permissions,
          projectId: form.projectId,
        }),
        headers: getAuthHeaders(),
        method: "POST",
      });

      setApiKeys((currentKeys) => [response.data.apiKey, ...currentKeys]);
      setSelectedApiKeyId(response.data.apiKey.id);
      if (response.data.rawApiKey) {
        setNewApiKey({
          apiKey: response.data.apiKey,
          rawApiKey: response.data.rawApiKey,
        });
      }
      setForm(emptyForm);
      setIsCreateOpen(false);
    } catch (requestError) {
      setCreateError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to create API key",
      );
    } finally {
      setIsCreating(false);
    }
  };

  const selectedRawApiKey =
    newApiKey && selectedApiKey && newApiKey.apiKey.id === selectedApiKey.id
      ? newApiKey.rawApiKey
      : undefined;

  const handleRevokeApiKey = async (id: string) => {
    try {
      setError("");
      const response = await apiRequest<{
        success: boolean;
        message: string;
        data: { apiKey: ApiKey };
      }>(`/api/api-keys/${id}`, {
        headers: getAuthHeaders(),
        method: "DELETE",
      });

      setApiKeys((currentKeys) =>
        currentKeys.map((apiKey) =>
          apiKey.id === id ? response.data.apiKey : apiKey,
        ),
      );
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to revoke API key",
      );
    }
  };

  return (
    <div className="mx-auto max-w-[1420px] px-4 py-5 sm:px-6">
      <div>
        <h1 className="text-3xl font-black tracking-tight">API Keys</h1>
        <p className="mt-1 text-sm text-slate-400">
          Create and manage secure keys for sending events to EventPulse.
        </p>
      </div>

      <ApiKeysFilterBar
        onCreateClick={handleOpenCreate}
        onSearchChange={setSearchQuery}
        searchQuery={searchQuery}
      />

      <section className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => (
          <ApiKeyMetricCard key={metric.label} metric={metric} />
        ))}
      </section>

      <section className="mt-4 grid gap-4 xl:grid-cols-[1fr_340px]">
        <div className="grid gap-4">
          {newApiKey ? (
            <section className="rounded-2xl border border-cyan-400/30 bg-cyan-500/8 p-5 shadow-[0_0_28px_rgba(34,211,238,0.12)]">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <p className="text-xs font-black uppercase tracking-[0.22em] text-cyan-300">
                    New key created
                  </p>
                  <h2 className="mt-2 text-lg font-black text-white">
                    Copy this API key now
                  </h2>
                  <p className="mt-1 text-sm text-slate-400">
                    EventPulse will only show the full key once. After refresh,
                    this key appears as a masked value.
                  </p>
                  <div className="mt-4 overflow-hidden rounded-xl border border-slate-700/80 bg-slate-950/80 p-4 font-mono text-xs text-cyan-100">
                    <p className="truncate" title={newApiKey.rawApiKey}>
                      {newApiKey.rawApiKey}
                    </p>
                  </div>
                </div>
                <button
                  className="h-10 rounded-lg border border-cyan-400/35 bg-cyan-500/10 px-4 text-xs font-black text-cyan-200 transition hover:bg-cyan-400/15"
                  onClick={() => navigator.clipboard.writeText(newApiKey.rawApiKey)}
                  type="button"
                >
                  Copy key
                </button>
              </div>
            </section>
          ) : null}

          <ApiKeysTable
            apiKeys={filteredApiKeys}
            error={error}
            isLoading={isLoading}
            onCreateClick={handleOpenCreate}
            onRetry={loadData}
            onRevoke={handleRevokeApiKey}
            onSelect={setSelectedApiKeyId}
            selectedApiKeyId={selectedApiKey?.id}
          />
          <section className="rounded-2xl border border-dashed border-slate-700/80 bg-slate-950/35 p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                <div className="flex size-14 items-center justify-center rounded-full border border-blue-400/40 bg-blue-500/10 text-3xl font-light text-cyan-300">
                  +
                </div>
                <div>
                  <h2 className="text-xl font-black text-white">Create API Key</h2>
                  <p className="mt-1 text-sm text-slate-400">
                    Generate a new API key to start sending events to EventPulse.
                  </p>
                </div>
              </div>
              <button
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-linear-to-r from-blue-600 to-violet-600 px-5 text-sm font-black text-white shadow-[0_0_24px_rgba(79,70,229,0.25)]"
                onClick={handleOpenCreate}
                type="button"
              >
                <span className="text-xl leading-none">+</span>
                Create new key
              </button>
            </div>
          </section>
        </div>

        <aside className="grid gap-4">
          <SecurityBestPracticesCard />
          <ApiKeyDetailsPanel
            apiKey={selectedApiKey}
            rawApiKey={selectedRawApiKey}
            onRevoke={handleRevokeApiKey}
          />
        </aside>
      </section>

      {isCreateOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 px-4 backdrop-blur-sm">
          <form
            className="w-full max-w-lg rounded-2xl border border-slate-700/80 bg-[#071426] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.45)]"
            onSubmit={handleCreateApiKey}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-black text-white">Create API Key</h2>
                <p className="mt-1 text-sm text-slate-400">
                  Generate a secure key for one of your EventPulse projects.
                </p>
              </div>
              <button
                className="flex size-9 items-center justify-center rounded-lg text-slate-400 transition hover:bg-white/5 hover:text-white"
                onClick={() => setIsCreateOpen(false)}
                type="button"
              >
                ×
              </button>
            </div>

            <div className="mt-6 grid gap-4">
              <label className="grid gap-2 text-sm font-bold text-slate-300">
                Key name
                <input
                  className="h-12 rounded-xl border border-slate-700/80 bg-slate-950/70 px-4 text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20"
                  onChange={(event) =>
                    setForm((currentForm) => ({
                      ...currentForm,
                      name: event.target.value,
                    }))
                  }
                  placeholder="Production Web SDK"
                  value={form.name}
                />
              </label>

              <label className="grid gap-2 text-sm font-bold text-slate-300">
                Project
                <select
                  className="h-12 rounded-xl border border-slate-700/80 bg-slate-950/70 px-4 text-white outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20"
                  disabled={projects.length === 0}
                  onChange={(event) =>
                    setForm((currentForm) => ({
                      ...currentForm,
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

              <label className="grid gap-2 text-sm font-bold text-slate-300">
                Permissions
                <input
                  className="h-12 rounded-xl border border-slate-700/80 bg-slate-950/70 px-4 text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20"
                  onChange={(event) =>
                    setForm((currentForm) => ({
                      ...currentForm,
                      permissions: event.target.value,
                    }))
                  }
                  placeholder="Ingest Events"
                  value={form.permissions}
                />
              </label>
            </div>

            {createError ? (
              <p className="mt-4 rounded-xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm font-bold text-rose-200">
                {createError}
              </p>
            ) : null}

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                className="h-11 rounded-xl border border-slate-700/80 px-5 text-sm font-black text-slate-300 transition hover:border-slate-500 hover:bg-white/5"
                onClick={() => setIsCreateOpen(false)}
                type="button"
              >
                Cancel
              </button>
              <button
                className="h-11 rounded-xl bg-linear-to-r from-blue-600 to-violet-600 px-5 text-sm font-black text-white shadow-[0_0_24px_rgba(79,70,229,0.25)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={isCreating || projects.length === 0}
                type="submit"
              >
                {isCreating ? "Creating..." : "Create API Key"}
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}
