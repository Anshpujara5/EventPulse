export const workspaceSettings = [
  ["Workspace Name", "EventPulse"],
  ["Workspace URL", "eventpulse.app/acme"],
  ["Default Project", "Production App"],
  ["Data Region", "Asia Pacific"],
] as const;

export const profileSettings = [
  ["Name", "Ansh Pujara"],
  ["Email", "ansh@example.com"],
  ["Role", "Workspace Admin"],
] as const;

export const teamMembers = [
  { name: "Ansh Pujara", initials: "AP", role: "Admin", status: "Active", tone: "bg-emerald-500/10 text-emerald-300" },
  { name: "Shruti Sharma", initials: "SS", role: "Developer", status: "Active", tone: "bg-emerald-500/10 text-emerald-300" },
  { name: "Lakshmi Rao", initials: "LR", role: "Manager", status: "Invited", tone: "bg-amber-500/10 text-amber-300" },
  { name: "Platform Team", initials: "PT", role: "Viewer", status: "Active", tone: "bg-emerald-500/10 text-emerald-300" },
] as const;

export const securitySettings = [
  ["Two-factor authentication", "Enabled", "shield"],
  ["Session timeout", "24 hours", "clock"],
  ["API key rotation reminder", "90 days", "key"],
  ["SSO", "Not configured", "user"],
] as const;

export const notificationPreferences = [
  ["Critical alerts", "Slack + Email", "bell"],
  ["Weekly reports", "Email", "document"],
  ["Failed event spikes", "Slack", "chart"],
  ["Billing alerts", "Email", "database"],
] as const;

export const billingUsage = [
  { label: "Events this month", value: "125K / 1M", percent: "12%", width: "w-[12%]" },
  { label: "Seats used", value: "4 / 10", percent: "40%", width: "w-[40%]" },
] as const;
