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

type DashboardHeaderContextValue = {
  projects: Project[];
  isLoadingProjects: boolean;
  selectedProjectId: string;
  selectedProject: Project | null;
  setSelectedProjectId: (id: string) => void;
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
    }),
    [
      projects,
      isLoadingProjects,
      selectedProjectId,
      selectedProject,
      setSelectedProjectId,
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
