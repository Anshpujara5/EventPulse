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
}

export interface EventSummary {
  total: number;
  today: number;
}

export interface EventsApiResponse {
  success: boolean;
  data: {
    events: EventRecord[];
    summary: EventSummary;
  };
}
