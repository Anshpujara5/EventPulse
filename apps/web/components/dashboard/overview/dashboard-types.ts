export interface DashboardProject {
  id: string;
  name: string;
  domain: string;
  status: "ACTIVE" | "INACTIVE";
  createdAt: string;
}

export interface DashboardApiKey {
  id: string;
  name: string;
  maskedKey: string;
  keyPrefix: string;
  status: "ACTIVE" | "REVOKED";
  createdAt: string;
  revokedAt: string | null;
  project: {
    id: string;
    name: string;
  };
}

export interface DashboardSummary {
  totalProjects: number;
  totalApiKeys: number;
  activeApiKeys: number;
  revokedApiKeys: number;
  recentProjects: DashboardProject[];
  recentApiKeys: DashboardApiKey[];
}
