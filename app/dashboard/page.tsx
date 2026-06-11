const navItems = [
  ["Overview", "cube"],
  ["Events", "list"],
  ["Analytics", "chart"],
  ["Projects", "folder"],
  ["API Keys", "key"],
  ["Alerts", "bell"],
  ["Settings", "settings"],
];

const metrics = [
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
];

const eventStream = [
  ["UserLogin", "auth-service", "2s ago", "200", "bg-cyan-400"],
  ["PaymentSuccess", "payments-service", "5s ago", "201", "bg-emerald-400"],
  ["APIRequest", "api-gateway", "8s ago", "GET", "bg-blue-400"],
  ["EmailSent", "notifications-service", "10s ago", "202", "bg-violet-400"],
  ["ErrorOccurred", "auth-service", "12s ago", "500", "bg-rose-400"],
];

const categories = [
  ["Auth", "32%", "bg-cyan-400"],
  ["Payments", "24%", "bg-blue-500"],
  ["API", "18%", "bg-violet-500"],
  ["Errors", "14%", "bg-rose-500"],
  ["Others", "12%", "bg-amber-400"],
];

const healthRows = ["Ingestion", "Processing", "Alerts", "Database"];

const apiSummary = [
  ["Active API Keys", "5"],
  ["Events accepted today", "42,982"],
  ["Queue status", "Normal"],
  ["Worker status", "Running"],
];

const activityRows = [
  ["UserLogin", "Production App", "Accepted", "Just now"],
  ["PaymentSuccess", "Web Dashboard", "Accepted", "1m ago"],
  ["APIRequest", "Mobile App", "Accepted", "2m ago"],
  ["EmailSent", "Production App", "Queued", "4m ago"],
  ["ErrorOccurred", "Staging Environment", "Failed", "8m ago"],
];

const apiKeys = [
  ["server-key-prod", "48.7K", "w-[92%]"],
  ["mobile-app-key", "32.1K", "w-[70%]"],
  ["web-dashboard-key", "18.9K", "w-[50%]"],
  ["staging-key", "8.4K", "w-[30%]"],
  ["analytics-key", "6.3K", "w-[24%]"],
];

const bars = [34, 48, 56, 72, 64, 83, 68, 76, 58, 70, 78, 61, 74, 90, 63, 75];

function LogoMark() {
  return (
    <span className="flex size-8 items-center justify-center">
      <svg
        aria-hidden="true"
        className="h-full w-full text-cyan-400 drop-shadow-[0_0_12px_rgba(34,211,238,0.7)]"
        fill="none"
        viewBox="0 0 36 36"
      >
        <path
          d="M2 18h5l3-12 5 24 4-17 3 8 3-4h9"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2.5"
        />
        <path d="M20 18h5" stroke="#8b5cf6" strokeLinecap="round" strokeWidth="2.5" />
      </svg>
    </span>
  );
}

function Icon({ name, className = "size-5" }: { name: string; className?: string }) {
  const paths: Record<string, string> = {
    activity: "M4 12h3l2-6 4 12 3-8 2 4h2",
    bell: "M6 9a6 6 0 0 1 12 0c0 7 3 7 3 9H3c0-2 3-2 3-9Zm4 12h4",
    chart: "M4 19V9m5 10V5m5 14v-7m5 7V8M3 20h18",
    clock: "M12 6v6l4 2m5-2a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z",
    cube: "m12 3 8 4.5v9L12 21l-8-4.5v-9L12 3Zm0 9 8-4.5M12 12 4 7.5M12 12v9",
    dots: "M12 12h.01M18 12h.01M6 12h.01",
    folder: "M3 6h7l2 2h9v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6Z",
    key: "M15 7a4 4 0 1 1-2.4 7.2L7 19.8H4.2V17l5.6-5.6A4 4 0 0 1 15 7Zm0 0h.01",
    list: "M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01",
    pulse: "M4 12h3l2-6 4 12 3-8 2 4h2",
    search: "M10.5 18a7.5 7.5 0 1 1 5.3-2.2L21 21",
    settings: "M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Zm8.5 4a7.7 7.7 0 0 0-.1-1l2-1.5-2-3.4-2.4 1a8.2 8.2 0 0 0-1.7-1L16 3.5h-4l-.4 2.6a8.2 8.2 0 0 0-1.7 1l-2.4-1-2 3.4 2 1.5a7.7 7.7 0 0 0 0 2l-2 1.5 2 3.4 2.4-1a8.2 8.2 0 0 0 1.7 1l.4 2.6h4l.4-2.6a8.2 8.2 0 0 0 1.7-1l2.4 1 2-3.4-2-1.5c.1-.3.1-.7.1-1Z",
    shield: "M12 3 5 6v6c0 4.5 3 7.8 7 9 4-1.2 7-4.5 7-9V6l-7-3Z",
  };

  return (
    <svg aria-hidden="true" className={className} fill="none" viewBox="0 0 24 24">
      <path
        d={paths[name]}
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function Card({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-2xl border border-slate-700/70 bg-[#071426]/85 shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_18px_50px_rgba(0,0,0,0.18)] ${className}`}
    >
      {children}
    </section>
  );
}

function MetricCard({ metric }: { metric: (typeof metrics)[number] }) {
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-slate-400">{metric.label}</p>
          <p className="mt-3 text-3xl font-black tracking-tight text-white">{metric.value}</p>
          <p className={`mt-2 text-sm font-bold ${metric.deltaTone}`}>
            ↑ {metric.delta} <span className="font-medium text-slate-500">vs last 24h</span>
          </p>
        </div>
        <div className="flex size-10 items-center justify-center rounded-full border border-blue-400/20 bg-blue-500/10 text-cyan-400">
          <Icon name={metric.icon} />
        </div>
      </div>
      <svg className="mt-4 h-12 w-full text-blue-400" viewBox="0 0 110 44">
        <path
          d={metric.spark}
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
        />
      </svg>
    </Card>
  );
}

function EventVolumeChart() {
  return (
    <Card className="p-5 lg:col-span-7">
      <div className="mb-3 flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-black text-white">Event Volume</h2>
          <p className="text-sm text-slate-500">Requests and errors across the last day</p>
        </div>
        <div className="flex items-center gap-4 text-xs text-slate-400">
          <span className="flex items-center gap-2">
            <span className="size-2 rounded-full bg-blue-400" />
            Requests
          </span>
          <span className="flex items-center gap-2">
            <span className="size-2 rounded-full bg-rose-400" />
            Errors
          </span>
        </div>
      </div>
      <div className="relative h-64 overflow-hidden rounded-xl bg-slate-950/45 p-4">
        <div className="absolute inset-x-4 top-8 border-t border-dashed border-slate-700/70" />
        <div className="absolute inset-x-4 top-20 border-t border-dashed border-slate-700/70" />
        <div className="absolute inset-x-4 top-32 border-t border-dashed border-slate-700/70" />
        <div className="absolute inset-x-4 top-44 border-t border-dashed border-slate-700/70" />
        <svg className="relative z-10 h-full w-full" viewBox="0 0 680 220" preserveAspectRatio="none">
          <path
            d="M0 185 C35 166 55 175 84 132 S142 150 172 92 235 154 274 116 336 86 382 117 438 166 486 128 544 82 590 130 636 150 680 112"
            fill="none"
            stroke="#0ea5e9"
            strokeLinecap="round"
            strokeWidth="3"
          />
          <path
            d="M0 204 C45 184 78 196 112 162 S178 185 216 148 276 184 318 160 382 190 426 154 492 185 534 165 604 190 680 166"
            fill="none"
            stroke="#f43f5e"
            strokeLinecap="round"
            strokeWidth="2.4"
          />
        </svg>
        <div className="absolute inset-x-6 bottom-3 flex justify-between text-xs text-slate-500">
          <span>19:00</span>
          <span>23:00</span>
          <span>03:00</span>
          <span>07:00</span>
          <span>11:00</span>
          <span>15:00</span>
          <span>Now</span>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-2 divide-x divide-slate-700/70 text-sm">
        <div>
          <p className="text-slate-500">Requests</p>
          <p className="text-2xl font-black text-white">42,982</p>
        </div>
        <div className="pl-6">
          <p className="text-slate-500">Errors</p>
          <p className="text-2xl font-black text-white">78 <span className="text-sm text-slate-500">(0.18%)</span></p>
        </div>
      </div>
    </Card>
  );
}

export default function DashboardPage() {
  return (
    <main className="min-h-screen bg-[#020814] text-white">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_20%_0%,rgba(14,165,233,0.16),transparent_30%),radial-gradient(circle_at_82%_14%,rgba(124,58,237,0.16),transparent_28%)]" />
      <div className="relative grid min-h-screen lg:grid-cols-[240px_1fr]">
        <aside className="border-b border-slate-800/80 bg-[#061121]/95 lg:sticky lg:top-0 lg:h-screen lg:border-b-0 lg:border-r">
          <div className="flex h-16 items-center gap-2 px-5">
            <LogoMark />
            <span className="text-2xl font-black tracking-tight">EventPulse</span>
          </div>
          <nav className="grid gap-1 px-4 py-3 sm:grid-cols-4 lg:block lg:space-y-2">
            {navItems.map(([item, icon], index) => (
              <a
                className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-bold transition ${
                  index === 0
                    ? "border border-blue-400/40 bg-blue-600/35 text-white shadow-[0_0_24px_rgba(37,99,235,0.16)]"
                    : "text-slate-400 hover:bg-white/[0.04] hover:text-white"
                }`}
                href="#"
                key={item}
              >
                <Icon name={icon} className="size-5" />
                <span>{item}</span>
                {item === "Alerts" ? (
                  <span className="ml-auto rounded-full bg-rose-500 px-2 py-0.5 text-xs text-white">3</span>
                ) : null}
              </a>
            ))}
          </nav>
          <div className="hidden px-4 lg:absolute lg:bottom-4 lg:left-0 lg:right-0 lg:block">
            <Card className="mb-4 p-4">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-full bg-violet-500/15 text-violet-300">
                  <Icon name="shield" />
                </div>
                <div>
                  <p className="text-xs text-slate-500">You&apos;re on</p>
                  <p className="font-bold text-white">Pro Plan</p>
                </div>
              </div>
              <p className="mt-4 text-xs text-slate-500">Events this month</p>
              <div className="mt-1 flex items-center justify-between text-xs">
                <span>125K / 1M</span>
                <span className="text-slate-500">12%</span>
              </div>
              <div className="mt-2 h-2 rounded-full bg-slate-800">
                <div className="h-full w-[12%] rounded-full bg-blue-500" />
              </div>
              <button className="mt-4 w-full rounded-lg bg-violet-600/25 px-4 py-2 text-sm font-bold text-violet-100" type="button">
                Upgrade Plan →
              </button>
            </Card>
            <div className="flex items-center justify-between px-3 py-2 text-sm font-bold text-slate-400">
              <span>Docs</span>
              <span>Support</span>
            </div>
          </div>
        </aside>

        <section className="min-w-0">
          <header className="sticky top-0 z-20 border-b border-slate-800/80 bg-[#020814]/85 px-4 py-3 backdrop-blur-xl sm:px-6">
            <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
              <div className="flex min-w-0 flex-1 flex-wrap items-center gap-3">
                <div className="flex h-11 w-full max-w-[390px] items-center gap-3 rounded-xl border border-slate-700/80 bg-slate-950/60 px-4 text-slate-400">
                  <Icon name="search" className="size-5" />
                  <input
                    className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-slate-500"
                    placeholder="Search events, projects, alerts..."
                  />
                </div>
                <button className="flex h-11 items-center gap-2 rounded-xl border border-slate-700/80 bg-slate-950/60 px-4 text-sm font-bold text-slate-200" type="button">
                  <Icon name="cube" className="size-4 text-cyan-400" />
                  Production App
                  <span className="text-slate-500">⌄</span>
                </button>
                <button className="flex h-11 items-center gap-2 rounded-xl border border-slate-700/80 bg-slate-950/60 px-4 text-sm font-bold text-slate-200" type="button">
                  <Icon name="clock" className="size-4 text-slate-400" />
                  Last 24 hours
                  <span className="text-slate-500">⌄</span>
                </button>
              </div>
              <div className="flex items-center gap-3">
                <button className="h-11 rounded-xl bg-gradient-to-r from-blue-600 to-violet-600 px-5 text-sm font-black text-white shadow-[0_0_24px_rgba(79,70,229,0.25)]" type="button">
                  Create Alert
                </button>
                <button className="flex size-11 items-center justify-center rounded-full border border-cyan-400/50 bg-slate-950 text-sm font-black text-white" type="button">
                  JD
                </button>
              </div>
            </div>
          </header>

          <div className="mx-auto max-w-[1420px] px-4 py-5 sm:px-6">
            <div className="mb-4">
              <h1 className="text-3xl font-black tracking-tight">Dashboard</h1>
              <p className="mt-1 text-sm text-slate-400">Monitor your product events and system activity.</p>
            </div>

            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {metrics.map((metric) => (
                <MetricCard key={metric.label} metric={metric} />
              ))}
            </section>

            <section className="mt-4 grid gap-4 lg:grid-cols-12">
              <EventVolumeChart />

              <Card className="p-5 lg:col-span-5">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-lg font-black">Live Event Stream</h2>
                  <span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-bold text-emerald-300">
                    Live
                  </span>
                </div>
                <div className="divide-y divide-slate-800 overflow-hidden rounded-xl border border-slate-800">
                  {eventStream.map(([event, source, time, status, dot]) => (
                    <div className="grid grid-cols-[1fr_auto_auto] items-center gap-3 bg-slate-950/25 px-4 py-3 text-sm" key={event}>
                      <div className="flex items-center gap-3">
                        <span className={`size-2.5 rounded-full ${dot}`} />
                        <div>
                          <p className="font-bold text-white">{event}</p>
                          <p className="text-xs text-slate-500">{source}</p>
                        </div>
                      </div>
                      <span className="rounded-md bg-white/[0.04] px-2 py-1 text-xs text-slate-300">{status}</span>
                      <span className="text-xs text-slate-500">{time}</span>
                    </div>
                  ))}
                </div>
              </Card>
            </section>

            <section className="mt-4 grid gap-4 xl:grid-cols-[1.05fr_1fr_1.45fr_1.65fr]">
              <Card className="p-5">
                <h2 className="text-lg font-black">Event Categories</h2>
                <div className="mt-5 flex items-center gap-5">
                  <div
                    className="grid size-32 place-items-center rounded-full"
                    style={{
                      background:
                        "conic-gradient(#22d3ee 0 32%,#3b82f6 32% 56%,#8b5cf6 56% 74%,#f43f5e 74% 88%,#f59e0b 88% 100%)",
                    }}
                  >
                    <div className="grid size-20 place-items-center rounded-full bg-[#071426] text-center">
                      <span className="text-xl font-black">125,842</span>
                      <span className="-mt-4 text-xs text-slate-500">Total</span>
                    </div>
                  </div>
                  <div className="flex-1 space-y-2">
                    {categories.map(([name, percent, color]) => (
                      <div className="flex items-center justify-between text-sm" key={name}>
                        <span className="flex items-center gap-2 text-slate-300">
                          <span className={`size-2 rounded-full ${color}`} />
                          {name}
                        </span>
                        <span className="text-slate-400">{percent}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </Card>

              <Card className="p-5">
                <h2 className="text-lg font-black">System Health</h2>
                <div className="mt-4 divide-y divide-slate-800">
                  {healthRows.map((row) => (
                    <div className="flex items-center justify-between py-3 text-sm" key={row}>
                      <span className="flex items-center gap-2 text-slate-300">
                        <span className="size-2 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.75)]" />
                        {row}
                      </span>
                      <span className="rounded-md bg-emerald-500/10 px-2 py-1 text-xs font-black text-emerald-300">
                        Healthy
                      </span>
                    </div>
                  ))}
                </div>
              </Card>

              <Card className="p-5">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-lg font-black">API Traffic</h2>
                  <span className="text-xs font-bold text-cyan-300">Healthy</span>
                </div>
                <div className="flex h-40 items-end gap-2 rounded-xl bg-slate-950/35 p-4">
                  {bars.map((height, index) => (
                    <div className="flex-1 rounded-t bg-gradient-to-t from-blue-700 to-cyan-300" key={`${height}-${index}`} style={{ height: `${height}%` }} />
                  ))}
                </div>
                <div className="mt-4 grid grid-cols-3 text-center text-sm text-slate-400">
                  <span>Requests</span>
                  <span>Latency</span>
                  <span>Errors</span>
                </div>
              </Card>

              <Card className="p-5">
                <h2 className="text-lg font-black">Project & API Summary</h2>
                <div className="mt-4 grid gap-3">
                  {apiSummary.map(([label, value]) => (
                    <div className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/25 px-4 py-3 text-sm" key={label}>
                      <span className="text-slate-400">{label}</span>
                      <span className="font-black text-white">{value}</span>
                    </div>
                  ))}
                </div>
              </Card>
            </section>

            <section className="mt-4 grid gap-4 xl:grid-cols-[1.2fr_1fr]">
              <Card className="overflow-hidden">
                <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
                  <h2 className="text-lg font-black">Recent Activity</h2>
                  <span className="text-sm font-bold text-cyan-300">View all events →</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[680px] text-left text-sm">
                    <thead className="text-xs uppercase tracking-wide text-slate-500">
                      <tr>
                        <th className="px-5 py-3">Event</th>
                        <th className="px-5 py-3">Project</th>
                        <th className="px-5 py-3">Status</th>
                        <th className="px-5 py-3">Timestamp</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {activityRows.map(([event, project, status, time]) => (
                        <tr className="text-slate-300" key={`${event}-${project}`}>
                          <td className="px-5 py-4 font-bold text-white">{event}</td>
                          <td className="px-5 py-4">{project}</td>
                          <td className="px-5 py-4">
                            <span
                              className={`rounded-md px-2 py-1 text-xs font-black ${
                                status === "Failed"
                                  ? "bg-rose-500/10 text-rose-300"
                                  : status === "Queued"
                                    ? "bg-amber-500/10 text-amber-300"
                                    : "bg-emerald-500/10 text-emerald-300"
                              }`}
                            >
                              {status}
                            </span>
                          </td>
                          <td className="px-5 py-4 text-slate-500">{time}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>

              <Card className="p-5">
                <div className="mb-5 flex items-center justify-between">
                  <h2 className="text-lg font-black">API Key Usage</h2>
                  <span className="rounded-lg border border-slate-700 px-3 py-1 text-xs text-slate-400">Top 5</span>
                </div>
                <div className="space-y-4">
                  {apiKeys.map(([keyName, count, width]) => (
                    <div key={keyName}>
                      <div className="mb-2 flex items-center justify-between text-sm">
                        <span className="text-slate-300">{keyName}</span>
                        <span className="font-bold text-white">{count}</span>
                      </div>
                      <div className="h-2 rounded-full bg-slate-800">
                        <div className={`h-full rounded-full bg-gradient-to-r from-cyan-400 to-blue-600 ${width}`} />
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-5 flex items-center justify-between border-t border-slate-800 pt-4">
                  <span className="text-slate-400">Total Requests</span>
                  <span className="text-2xl font-black">114.4K</span>
                </div>
              </Card>
            </section>
          </div>
        </section>
      </div>
    </main>
  );
}
