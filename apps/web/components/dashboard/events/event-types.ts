export interface EventRecord {
  id: string;
  name: string;
  properties: Record<string, unknown>;
  userId: string;
  projectId: string;
  apiKeyId: string;
  createdAt: string;
  projectName?: string;
  projectDomain?: string;
  apiKeyName?: string;
  keyPrefix?: string;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export interface EventSummary {
  total: number;
  today: number;
  // Count of events matching the current project/time-range/search scope —
  // may be far smaller than `total` (which is always unfiltered, all-time,
  // all-projects). Used to explain why the event list can show far fewer
  // rows than the "Total Events" card.
  matching: number;
}

export interface EventsApiResponse {
  success: boolean;
  data: {
    events: EventRecord[];
    summary: EventSummary;
  };
}
