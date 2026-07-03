"use client";

import { apiRequest } from "@/lib/api";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type {
  Project,
  ProjectsResponse,
} from "@/components/dashboard/api-keys/api-key-types";

export const ALL_PROJECTS_ID = "all";

const SELECTED_PROJECT_KEY = "eventpulse_selected_project";
const TIME_RANGE_KEY = "eventpulse_time_range";

export type TimeRange = "24h" | "7d" | "30d" | "all";

export const TIME_RANGE_OPTIONS: { value: TimeRange; label: string }[] = [
  { value: "24h", label: "Last 24 hours" },
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "all", label: "All time" },
];

type DashboardHeaderContextValue = {
  projects: Project[];
  isLoadingProjects: boolean;
  selectedProjectId: string;
  selectedProject: Project | null;
  setSelectedProjectId: (id: string) => void;
  timeRange: TimeRange;
  setTimeRange: (range: TimeRange) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
};

const DashboardHeaderContext = createContext<DashboardHeaderContextValue | null>(
  null,
);

export function DashboardHeaderProvider({ children }: { children: ReactNode }) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoadingProjects, setIsLoadingProjects] = useState(
    () =>
      typeof window !== "undefined" &&
      !!localStorage.getItem("eventpulse_token"),
  );
  const [selectedProjectId, setSelectedProjectId] = useLocalStorage<string>(
    SELECTED_PROJECT_KEY,
    ALL_PROJECTS_ID,
  );
  const [timeRange, setTimeRange] = useLocalStorage<TimeRange>(
    TIME_RANGE_KEY,
    "24h",
  );
  // Search is intentionally transient (not persisted): a shared query the
  // header search box writes to and each page reads to filter its own data.
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    let isActive = true;
    const token =
      typeof window !== "undefined"
        ? localStorage.getItem("eventpulse_token")
        : null;

    if (!token) {
      return;
    }

    async function loadProjects() {
      try {
        const response = await apiRequest<ProjectsResponse>("/api/projects", {
          method: "GET",
          headers: { Authorization: `Bearer ${token}` },
        });

        if (isActive) {
          setProjects(response.data.projects);
        }
      } catch {
        // Header still works with an empty project list.
      } finally {
        if (isActive) {
          setIsLoadingProjects(false);
        }
      }
    }

    void loadProjects();

    return () => {
      isActive = false;
    };
  }, []);

  const selectedProject = useMemo(
    () => projects.find((project) => project.id === selectedProjectId) ?? null,
    [projects, selectedProjectId],
  );

  const value = useMemo<DashboardHeaderContextValue>(
    () => ({
      projects,
      isLoadingProjects,
      selectedProjectId,
      selectedProject,
      setSelectedProjectId,
      timeRange,
      setTimeRange,
      searchQuery,
      setSearchQuery,
    }),
    [
      projects,
      isLoadingProjects,
      selectedProjectId,
      selectedProject,
      setSelectedProjectId,
      timeRange,
      setTimeRange,
      searchQuery,
      setSearchQuery,
    ],
  );

  return (
    <DashboardHeaderContext.Provider value={value}>
      {children}
    </DashboardHeaderContext.Provider>
  );
}

export function useDashboardHeaderState(): DashboardHeaderContextValue {
  const context = useContext(DashboardHeaderContext);

  if (!context) {
    throw new Error(
      "useDashboardHeaderState must be used within a DashboardHeaderProvider",
    );
  }

  return context;
}
