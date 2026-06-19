export const eventMetrics = [
  {
    label: "Total Events",
    value: "1.24M",
    detail: "Across all projects",
    icon: "database",
    tone: "text-cyan-400",
    boxClassName: "border-cyan-400/25 bg-cyan-500/10",
  },
  {
    label: "Events Today",
    value: "125,842",
    detail: "12.8% vs yesterday",
    icon: "pulse",
    tone: "text-emerald-400",
    boxClassName: "border-emerald-400/20 bg-emerald-500/10",
  },
  {
    label: "Live Events / min",
    value: "2,481",
    detail: "Streaming now",
    icon: "activity",
    tone: "text-blue-400",
    boxClassName: "border-blue-400/25 bg-blue-500/10",
  },
  {
    label: "Failed Events",
    value: "128",
    detail: "0.10% failure rate",
    icon: "bell",
    tone: "text-rose-400",
    boxClassName: "border-rose-400/25 bg-rose-500/10",
  },
] as const;

export const liveEvents = [
  {
    name: "page_view",
    project: "Production App",
    userId: "user_4821",
    status: "Success",
    timestamp: "2 sec ago",
    source: "Web SDK",
    payloadSize: "2.4 KB",
  },
  {
    name: "signup_clicked",
    project: "Marketing Website",
    userId: "user_1930",
    status: "Success",
    timestamp: "8 sec ago",
    source: "Web SDK",
    payloadSize: "1.1 KB",
  },
  {
    name: "payment_completed",
    project: "Payments Service",
    userId: "user_8842",
    status: "Success",
    timestamp: "14 sec ago",
    source: "Server API",
    payloadSize: "3.8 KB",
  },
  {
    name: "checkout_failed",
    project: "Production App",
    userId: "user_5529",
    status: "Failed",
    timestamp: "31 sec ago",
    source: "Web SDK",
    payloadSize: "2.9 KB",
  },
  {
    name: "api_key_created",
    project: "Dashboard",
    userId: "admin_1201",
    status: "Success",
    timestamp: "1 min ago",
    source: "Console",
    payloadSize: "0.8 KB",
  },
  {
    name: "password_reset",
    project: "Production App",
    userId: "user_7741",
    status: "Warning",
    timestamp: "1 min ago",
    source: "Web SDK",
    payloadSize: "1.7 KB",
  },
  {
    name: "subscription_delayed",
    project: "Payments Service",
    userId: "user_3312",
    status: "Delayed",
    timestamp: "3 min ago",
    source: "Server API",
    payloadSize: "2.6 KB",
  },
] as const;

export const throughputBars = [42, 58, 65, 52, 76, 88, 70, 96, 84, 62, 74, 91];

export const selectedEventDetails = [
  ["Event", "payment_completed"],
  ["Project", "Payments Service"],
  ["User", "user_8842"],
  ["Source", "Server API"],
  ["Status", "Success"],
  ["Timestamp", "14 sec ago"],
] as const;

export const selectedEventPayload = `{
  "event": "payment_completed",
  "order_id": "ord_9f8d2a",
  "amount": 129.99,
  "currency": "USD",
  "source": "Server API",
  "user_id": "user_8842",
  "payment_method": "card",
  "status": "succeeded"
}`;
