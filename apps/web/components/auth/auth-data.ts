export type TextIconItem = readonly [string, string, string];
export type StatItem = readonly [string, string, string];

export const sidebarItems = [
  "Overview",
  "Events",
  "Alerts",
  "Analytics",
  "Projects",
  "API Keys",
  "Settings",
];

export const defaultBottomBenefits = [
  ["Commerce Funnel", "See product view → cart → purchase", "pulse"],
  ["Simple Events API", "Send commerce events over HTTPS", "code"],
  ["Friction Signals", "Surface out-of-stock and payment failures", "stack"],
  ["Store Friendly", "Docs, examples & fast setup", "heart"],
] as const;

export const authTrustBadges = [
  "GDPR Ready",
  "Encrypted at Rest",
  "Scoped API Keys",
];

export const previewCategories = [
  "Product views 38%",
  "Add to cart 24%",
  "Checkout 18%",
  "Purchases 12%",
];
export const previewHealthRows = ["Product Views", "Add to Cart", "Checkout", "Purchases"];
