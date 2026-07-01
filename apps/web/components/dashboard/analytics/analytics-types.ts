export interface AnalyticsSummary {
  totalEvents: number;
  eventsToday: number;
  eventsLast24h: number;
  activeProjects: number;
}

export interface TopEvent {
  name: string;
  count: number;
}

export interface ProjectEventCount {
  projectId: string;
  projectName: string;
  count: number;
}

export interface HourlyBucket {
  hour: string; // ISO datetime string for the hour bucket
  count: number;
}

export interface RecentEvent {
  id: string;
  name: string;
  projectName: string;
  createdAt: string;
}

export interface AnalyticsData {
  summary: AnalyticsSummary;
  topEvents: TopEvent[];
  eventsByProject: ProjectEventCount[];
  hourlyTrend: HourlyBucket[];
  recentActivity: RecentEvent[];
}
