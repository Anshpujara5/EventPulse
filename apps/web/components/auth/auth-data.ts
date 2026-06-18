export type TextIconItem = readonly [string, string, string];
export type StatItem = readonly [string, string, string];

export const sidebarItems = [
  "Overview",
  "Events",
  "Alerts",
  "Analytics",
  "Servers",
  "API Keys",
  "Projects",
  "Settings",
];

export const defaultBottomBenefits = [
  ["Real-time Monitoring", "Track and react instantly", "pulse"],
  ["Powerful APIs", "RESTful, GraphQL & Webhooks", "code"],
  ["Scalable Infrastructure", "Built to handle millions of events", "stack"],
  ["Developer Friendly", "Docs, SDKs & 24/7 support", "heart"],
] as const;

export const authTrustBadges = [
  "SOC 2 Type II Compliant",
  "GDPR Ready",
  "99.9% Uptime SLA",
];

export const previewCategories = ["Auth 32%", "Payments 24%", "API 18%", "Errors 14%"];
export const previewHealthRows = ["Ingestion", "Processing", "Alerts", "Database"];
