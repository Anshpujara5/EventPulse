export const navItems = [
  ["Overview", "cube"],
  ["Events", "list"],
  ["Analytics", "chart"],
  ["Projects", "folder"],
  ["API Keys", "key"],
  ["Alerts", "bell"],
  ["Settings", "settings"],
] as const;

export const metrics = [
  {
    label: "Total Events",
    value: "125,842",
    delta: "12.8%",
    deltaTone: "text-emerald-400",
    icon: "pulse",
    spark: "M0 38 L15 35 L28 31 L42 32 L54 24 L66 27 L78 17 L91 21 L104 8",
  },
  {
    label: "Events / min",
    value: "2,094",
    delta: "8.4%",
    deltaTone: "text-emerald-400",
    icon: "clock",
    spark: "M0 34 L14 33 L27 29 L39 31 L50 24 L62 28 L74 18 L87 20 L104 10",
  },
  {
    label: "Active Projects",
    value: "12",
    delta: "3 new",
    deltaTone: "text-cyan-300",
    icon: "folder",
    spark: "M0 35 L14 35 L28 30 L42 31 L56 26 L70 27 L84 22 L104 19",
  },
  {
    label: "Error Rate",
    value: "0.18%",
    delta: "0.05%",
    deltaTone: "text-emerald-400",
    icon: "activity",
    spark: "M0 38 L15 36 L28 35 L42 30 L54 29 L66 24 L78 27 L91 21 L104 12",
  },
] as const;

export const eventStream = [
  ["UserLogin", "auth-service", "2s ago", "200", "bg-cyan-400"],
  ["PaymentSuccess", "payments-service", "5s ago", "201", "bg-emerald-400"],
  ["APIRequest", "api-gateway", "8s ago", "GET", "bg-blue-400"],
  ["EmailSent", "notifications-service", "10s ago", "202", "bg-violet-400"],
  ["ErrorOccurred", "auth-service", "12s ago", "500", "bg-rose-400"],
] as const;

export const categories = [
  ["Auth", "32%", "bg-cyan-400"],
  ["Payments", "24%", "bg-blue-500"],
  ["API", "18%", "bg-violet-500"],
  ["Errors", "14%", "bg-rose-500"],
  ["Others", "12%", "bg-amber-400"],
] as const;

export const healthRows = ["Ingestion", "Processing", "Alerts", "Database"];

export const apiSummary = [
  ["Active API Keys", "5"],
  ["Events accepted today", "42,982"],
  ["Queue status", "Normal"],
  ["Worker status", "Running"],
] as const;

export const activityRows = [
  ["UserLogin", "Production App", "Accepted", "Just now"],
  ["PaymentSuccess", "Web Dashboard", "Accepted", "1m ago"],
  ["APIRequest", "Mobile App", "Accepted", "2m ago"],
  ["EmailSent", "Production App", "Queued", "4m ago"],
  ["ErrorOccurred", "Staging Environment", "Failed", "8m ago"],
] as const;

export const apiKeys = [
  ["server-key-prod", "48.7K", "w-[92%]"],
  ["mobile-app-key", "32.1K", "w-[70%]"],
  ["web-dashboard-key", "18.9K", "w-[50%]"],
  ["staging-key", "8.4K", "w-[30%]"],
  ["analytics-key", "6.3K", "w-[24%]"],
] as const;

export const bars = [34, 48, 56, 72, 64, 83, 68, 76, 58, 70, 78, 61, 74, 90, 63, 75];
