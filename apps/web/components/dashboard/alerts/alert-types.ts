export type AlertStatus = "ACTIVE" | "INACTIVE";

export interface AlertProject {
  id: string;
  name: string;
  status: "ACTIVE" | "INACTIVE";
}

export interface Alert {
  id: string;
  name: string;
  eventName: string;
  threshold: number;
  windowMinutes: number;
  status: AlertStatus;
  projectId: string;
  createdAt: string;
  updatedAt: string;
  project: AlertProject;
  lastTriggeredAt: string | null;
  triggerCount: number;
}

export interface AlertsResponse {
  success: boolean;
  data: { alerts: Alert[] };
}

export interface AlertMutationResponse {
  success: boolean;
  message: string;
  data: { alert: Alert };
}

export interface AlertTrigger {
  id: string;
  eventCount: number;
  threshold: number;
  createdAt: string;
  alert: {
    id: string;
    name: string;
    eventName: string;
    project: {
      id: string;
      name: string;
    };
  };
}

export interface AlertTriggersResponse {
  success: boolean;
  data: { triggers: AlertTrigger[] };
}
