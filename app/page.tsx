const navLinks = ["Features", "How It Works", "Pricing", "Docs", "Contact"];

const heroTrust = [
  { label: "No credit card required", icon: "shield" },
  { label: "Setup in 60 seconds", icon: "bolt" },
  { label: "Secure by design", icon: "lock" },
];

const overviewStats = [
  { label: "Events Ingested", value: "125,842", trend: "12.6%", icon: "chart" },
  { label: "Events / min", value: "2,094", trend: "8.4%", icon: "timer" },
  { label: "Active Alerts", value: "23", trend: "3", icon: "bell" },
  { label: "Error Rate", value: "0.18%", trend: "0.05%", icon: "spark" },
];

const eventRows = [
  ["UserLogin", "user_123", "2s ago"],
  ["PaymentSuccess", "order_8476", "3s ago"],
  ["APIRequest", "GET /v1/products", "3s ago"],
  ["EmailSent", "welcome@email.com", "4s ago"],
  ["ErrorOccurred", "NullReferenceException", "4s ago"],
];

const categories = [
  ["Auth", "32%"],
  ["Payments", "24%"],
  ["API", "18%"],
  ["Errors", "14%"],
  ["Others", "12%"],
];

const health = ["Ingestion", "Processing", "Alerts", "Databases"];

const platformStats = [
  { value: "10M+", label: "Events Processed", icon: "database" },
  { value: "99.9%", label: "Uptime Guaranteed", icon: "shield" },
  { value: "Real-Time", label: "Alerts & Notifications", icon: "bolt" },
  { value: "Multi-Server", label: "Ready & Scalable", icon: "globe" },
];

const featureCards = [
  {
    title: "API Key Integration",
    description:
      "Create project-specific API keys to authenticate and ingest events securely.",
    icon: "key",
  },
  {
    title: "Real-Time Alerts",
    description:
      "Set custom alert rules and get notified instantly via Email, Slack, Webhook, or Discord.",
    icon: "bell",
  },
  {
    title: "Analytics Dashboard",
    description:
      "Powerful insights with real-time charts, trends, and event breakdowns.",
    icon: "analytics",
  },
  {
    title: "Load Balancing",
    description:
      "Distribute incoming traffic efficiently across multiple servers and regions.",
    icon: "network",
  },
  {
    title: "Multi-Server Architecture",
    description:
      "Horizontally scalable, fault-tolerant architecture built for high availability.",
    icon: "server",
  },
  {
    title: "Event Search & Filtering",
    description:
      "Search, filter, and drill down into events with advanced query capabilities.",
    icon: "search",
  },
];

const steps = [
  {
    title: "Create Project",
    description: "Sign up and create a new project in seconds.",
    icon: "document",
  },
  {
    title: "Generate API Key",
    description: "Generate a secure API key unique to your project.",
    icon: "link",
  },
  {
    title: "Send Events",
    description: "Send events to our API using a simple HTTPS request.",
    icon: "send",
  },
  {
    title: "Monitor & Alert",
    description: "Track in real time, analyze, and get alerted instantly.",
    icon: "monitor",
  },
];

const securityBullets = [
  "Scoped & Revocable",
  "Encrypted Storage",
  "No Secret Logging",
  "Rate Limit Protected",
];

function LogoMark({ compact = false }: { compact?: boolean }) {
  return (
    <span
      className={`relative flex items-center justify-center ${
        compact ? "size-7" : "size-9"
      }`}
    >
      <svg
        aria-hidden="true"
        className="h-full w-full text-cyan-400 drop-shadow-[0_0_14px_rgba(34,211,238,0.75)]"
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
        <path
          d="M20 18h5"
          stroke="#8b5cf6"
          strokeLinecap="round"
          strokeWidth="2.5"
        />
      </svg>
    </span>
  );
}

function Icon({ name, className = "size-6" }: { name: string; className?: string }) {
  const paths: Record<string, string> = {
    analytics: "M4 19V9m5 10V5m5 14v-7m5 7V8M3 20h18",
    bell: "M6 9a6 6 0 0 1 12 0c0 7 3 7 3 9H3c0-2 3-2 3-9Zm4 12h4",
    bolt: "m13 2-9 12h7l-1 8 9-12h-7l1-8Z",
    chart: "M4 17h3l2-4 4 2 4-7 3 3",
    check: "m5 12 4 4L19 6",
    database: "M4 6c0 2 4 4 8 4s8-2 8-4-4-4-8-4-8 2-8 4Zm0 0v6c0 2 4 4 8 4s8-2 8-4V6M4 12v6c0 2 4 4 8 4s8-2 8-4v-6",
    document: "M7 3h7l4 4v14H7V3Zm7 0v5h5M10 13h6M10 17h4",
    globe: "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm0 0c3 3 4 6 4 10s-1 7-4 10M12 2C9 5 8 8 8 12s1 7 4 10M2 12h20",
    key: "M15 7a4 4 0 1 1-2.4 7.2L7 19.8H4.2V17l5.6-5.6A4 4 0 0 1 15 7Zm0 0h.01",
    link: "M10 13a5 5 0 0 0 7.1 0l2-2a5 5 0 0 0-7.1-7.1l-1.1 1.1M14 11a5 5 0 0 0-7.1 0l-2 2A5 5 0 0 0 12 20l1.1-1.1",
    lock: "M7 11V8a5 5 0 0 1 10 0v3M5 11h14v10H5V11Zm7 4v2",
    monitor: "M4 5h16v11H4V5Zm5 16h6m-3-5v5m-5-9 3-3 2 2 4-5",
    network: "M12 5v6m0 0H6v6m6-6h6v6M4 17h4v4H4v-4Zm8-14h4v4h-4V3Zm4 14h4v4h-4v-4Z",
    play: "m8 5 11 7-11 7V5Z",
    search: "M10.5 18a7.5 7.5 0 1 1 5.3-2.2L21 21",
    send: "m21 3-7 18-4-8-8-4 19-6Z",
    server: "M5 4h14v6H5V4Zm0 10h14v6H5v-6Zm3-7h.01M8 17h.01",
    shield: "M12 3 5 6v6c0 4.5 3 7.8 7 9 4-1.2 7-4.5 7-9V6l-7-3Z",
    spark: "M12 3v5m0 8v5m9-9h-5M8 12H3m14.1-7.1-3.5 3.5M10.4 15.6l-3.5 3.5m12.2 0-3.5-3.5M10.4 8.4 6.9 4.9",
    timer: "M10 2h4m-2 6v5l3 2m6-2a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z",
  };

  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      viewBox="0 0 24 24"
    >
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

function DashboardMockup() {
  return (
    <div className="rounded-[18px] border border-slate-600/60 bg-slate-950/80 p-2 shadow-[0_0_55px_rgba(37,99,235,0.22)] backdrop-blur-xl">
      <div className="grid overflow-hidden rounded-2xl border border-white/10 bg-[#07101f] md:grid-cols-[126px_1fr]">
        <aside className="hidden border-r border-white/10 bg-white/[0.035] p-4 md:block">
          <div className="mb-5 flex items-center gap-2">
            <LogoMark compact />
            <span className="text-sm font-bold text-white">EventPulse</span>
          </div>
          <div className="space-y-1.5 text-[11px] text-slate-300">
            {["Overview", "Events", "Alerts", "Analytics", "Servers", "API Keys", "Projects", "Settings"].map(
              (item, index) => (
                <div
                  className={`flex items-center gap-2 rounded-md px-2.5 py-2 ${
                    index === 0 ? "bg-blue-600/75 text-white" : "hover:bg-white/5"
                  }`}
                  key={item}
                >
                  <span className="size-1.5 rounded-full bg-cyan-300" />
                  {item}
                </div>
              ),
            )}
          </div>
          <div className="mt-20 space-y-2 text-[11px] text-slate-400">
            <p>Docs</p>
            <p>Support</p>
          </div>
        </aside>

        <div className="p-4">
          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm font-bold text-white">Overview</p>
            <div className="flex items-center gap-2">
              <span className="rounded-md border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] text-slate-300">
                Last 1 Hour
              </span>
              <span className="flex size-7 items-center justify-center rounded-md border border-white/10 bg-white/5 text-cyan-300">
                <Icon name="spark" className="size-4" />
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
            {overviewStats.map((stat, index) => (
              <div
                className="rounded-lg border border-white/10 bg-white/[0.045] p-3"
                key={stat.label}
              >
                <div className="flex items-start justify-between">
                  <p className="text-[10px] text-slate-400">{stat.label}</p>
                  <span
                    className={`flex size-5 items-center justify-center rounded bg-white/5 ${
                      index === 2 ? "text-rose-300" : "text-cyan-300"
                    }`}
                  >
                    <Icon name={stat.icon} className="size-3.5" />
                  </span>
                </div>
                <p className="mt-1 text-xl font-extrabold text-white">
                  {stat.value}
                </p>
                <div className="mt-1 flex items-center gap-1 text-[10px] text-emerald-300">
                  <span>{index === 2 ? "+" : "v"}</span>
                  {stat.trend}
                </div>
                <svg className="mt-1 h-5 w-full text-cyan-400" viewBox="0 0 100 24">
                  <polyline
                    fill="none"
                    points="0,20 14,17 25,19 36,12 48,14 60,9 72,11 85,5 100,7"
                    stroke="currentColor"
                    strokeWidth="2"
                  />
                </svg>
              </div>
            ))}
          </div>

          <div className="mt-3 grid gap-3 lg:grid-cols-[1fr_1.15fr]">
            <div className="rounded-lg border border-white/10 bg-white/[0.035] p-3">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-xs font-bold text-white">Event Stream</p>
                <span className="rounded-full bg-emerald-400/10 px-2 py-0.5 text-[10px] text-emerald-300">
                  Live
                </span>
              </div>
              <div className="space-y-1.5">
                {eventRows.map(([event, source, time], index) => (
                  <div
                    className="grid grid-cols-[18px_1fr_auto] items-center gap-2 rounded-md bg-slate-950/45 px-2 py-1.5"
                    key={event}
                  >
                    <span
                      className={`size-4 rounded-full ${
                        index === 4 ? "bg-rose-500/25" : "bg-cyan-400/15"
                      }`}
                    />
                    <span>
                      <span className="block text-[11px] font-medium text-white">
                        {event}
                      </span>
                      <span className="block truncate text-[9px] text-slate-500">
                        {source}
                      </span>
                    </span>
                    <span className="text-[9px] text-slate-500">{time}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-lg border border-white/10 bg-white/[0.035] p-3">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-xs font-bold text-white">API Traffic</p>
                <span className="text-[10px] text-cyan-300">View details</span>
              </div>
              <svg className="h-28 w-full" viewBox="0 0 320 120">
                <path
                  d="M0 96 C28 72 35 76 54 42 S90 75 112 43 145 78 170 47 202 74 228 44 262 73 320 52"
                  fill="none"
                  stroke="#0ea5e9"
                  strokeWidth="3"
                />
                <path
                  d="M0 104 C30 92 48 98 72 72 S106 92 130 78 168 98 194 72 234 95 260 80 288 92 320 77"
                  fill="none"
                  stroke="#ec4899"
                  strokeWidth="2"
                />
                <g className="text-[9px] fill-slate-500">
                  <text x="0" y="118">10:45</text>
                  <text x="82" y="118">11:00</text>
                  <text x="165" y="118">11:15</text>
                  <text x="248" y="118">11:45</text>
                </g>
              </svg>
            </div>
          </div>

          <div className="mt-3 grid gap-3 md:grid-cols-[1fr_1fr]">
            <div className="rounded-lg border border-white/10 bg-white/[0.035] p-3">
              <p className="mb-2 text-xs font-bold text-white">Event Categories</p>
              <div className="flex items-center gap-4">
                <div
                  className="size-16 rounded-full"
                  style={{
                    background:
                      "conic-gradient(#0ea5e9 0 32%, #8b5cf6 32% 56%, #ec4899 56% 74%, #22c55e 74% 88%, #f59e0b 88% 100%)",
                  }}
                >
                  <div className="m-4 size-8 rounded-full bg-[#07101f]" />
                </div>
                <div className="flex-1 space-y-1">
                  {categories.map(([name, percent]) => (
                    <div
                      className="flex justify-between text-[10px] text-slate-300"
                      key={name}
                    >
                      <span>{name}</span>
                      <span>{percent}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="rounded-lg border border-white/10 bg-white/[0.035] p-3">
              <p className="mb-2 text-xs font-bold text-white">System Health</p>
              <div className="space-y-2">
                {health.map((item) => (
                  <div className="flex items-center justify-between text-[11px]" key={item}>
                    <span className="flex items-center gap-2 text-slate-300">
                      <span className="size-1.5 rounded-full bg-emerald-400" />
                      {item}
                    </span>
                    <span className="rounded bg-emerald-400/10 px-1.5 py-0.5 text-[9px] font-bold text-emerald-300">
                      Healthy
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-center text-xs font-extrabold uppercase tracking-[0.18em] text-cyan-400">
      {children}
    </p>
  );
}

export default function Home() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#020814] text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_12%,rgba(14,165,233,0.24),transparent_26%),radial-gradient(circle_at_80%_20%,rgba(88,28,135,0.24),transparent_30%)]" />
      <div className="pointer-events-none absolute inset-x-0 top-16 h-[620px] bg-[linear-gradient(rgba(59,130,246,0.09)_1px,transparent_1px),linear-gradient(90deg,rgba(59,130,246,0.09)_1px,transparent_1px)] bg-[size:82px_82px]" />

      <header className="relative z-20 border-b border-white/10 bg-[#030b19]/80 backdrop-blur-xl">
        <nav className="mx-auto flex h-[62px] max-w-[1200px] items-center justify-between px-4 sm:px-6">
          <a className="flex items-center gap-2" href="#" aria-label="EventPulse home">
            <LogoMark />
            <span className="text-2xl font-extrabold tracking-tight">EventPulse</span>
          </a>

          <div className="hidden items-center gap-10 text-sm font-semibold text-slate-200 lg:flex">
            {navLinks.map((link) => (
              <a
                className="transition hover:text-cyan-300"
                href={`#${link.toLowerCase().replaceAll(" ", "-")}`}
                key={link}
              >
                {link}
              </a>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <a
              className="hidden rounded-lg border border-violet-400/35 bg-white/[0.02] px-6 py-2.5 text-sm font-bold text-white transition hover:border-cyan-300/50 sm:inline-flex"
              href="/signin"
            >
              Sign In
            </a>
            <a
              className="rounded-lg bg-gradient-to-r from-blue-600 to-cyan-400 px-5 py-2.5 text-sm font-extrabold text-white shadow-[0_0_24px_rgba(14,165,233,0.35)] transition hover:scale-[1.02]"
              href="/signup"
            >
              Get Started
            </a>
          </div>
        </nav>
      </header>

      <section className="relative z-10 mx-auto grid max-w-[1200px] items-center gap-8 px-4 pb-5 pt-12 sm:px-6 lg:grid-cols-[0.82fr_1.18fr] lg:pt-16">
        <div className="relative">
          <div className="absolute -right-12 top-32 hidden h-56 w-56 rounded-full border border-blue-500/20 bg-[radial-gradient(circle,rgba(37,99,235,0.35),transparent_58%)] opacity-80 blur-sm lg:block" />
          <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-blue-400/40 bg-blue-500/10 px-4 py-2 text-sm text-blue-200 shadow-[0_0_24px_rgba(37,99,235,0.16)]">
            <span className="size-2 rounded-full bg-blue-500 shadow-[0_0_14px_rgba(59,130,246,0.95)]" />
            Real-Time Event Monitoring & Alerting Platform
          </div>

          <h1 className="max-w-[540px] text-[42px] font-black leading-[1.08] tracking-tight text-white sm:text-[58px] lg:text-[56px]">
            Monitor Every Event. React in{" "}
            <span className="bg-gradient-to-r from-cyan-300 via-blue-500 to-violet-500 bg-clip-text text-transparent">
              Real Time.
            </span>
          </h1>
          <p className="mt-4 max-w-[510px] text-base leading-7 text-slate-300">
            EventPulse helps developers and teams ingest, track, analyze, and
            alert on critical product and system events through powerful APIs -
            in real time.
          </p>

          <div className="mt-7 flex flex-col gap-4 sm:flex-row">
            <a
              className="inline-flex h-13 items-center justify-center gap-4 rounded-lg bg-gradient-to-r from-cyan-400 via-blue-500 to-violet-600 px-9 text-base font-extrabold text-white shadow-[0_0_28px_rgba(37,99,235,0.34)]"
              href="/signup"
            >
              Start Free
              <span aria-hidden="true">-&gt;</span>
            </a>
            <a
              className="inline-flex h-13 items-center justify-center gap-4 rounded-lg border border-violet-400/45 bg-white/[0.03] px-9 text-base font-extrabold text-white"
              href="#how-it-works"
            >
              View Demo
              <Icon name="play" className="size-4 fill-current" />
            </a>
          </div>

          <div className="mt-6 flex flex-wrap gap-x-9 gap-y-3 text-xs text-slate-300">
            {heroTrust.map((item) => (
              <span className="flex items-center gap-2" key={item.label}>
                <Icon name={item.icon} className="size-4 text-cyan-400" />
                {item.label}
              </span>
            ))}
          </div>
        </div>

        <DashboardMockup />
      </section>

      <section className="relative z-10 mx-auto max-w-[1200px] px-4 py-4 sm:px-6">
        <div className="grid overflow-hidden rounded-xl border border-blue-300/25 bg-white/[0.045] shadow-[0_0_40px_rgba(37,99,235,0.16)] backdrop-blur md:grid-cols-4">
          {platformStats.map((stat) => (
            <div
              className="flex items-center gap-5 px-9 py-5 md:border-r md:border-white/10 last:md:border-r-0"
              key={stat.label}
            >
              <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-blue-500/15 text-cyan-400 shadow-[0_0_22px_rgba(59,130,246,0.25)]">
                <Icon name={stat.icon} className="size-7" />
              </div>
              <div>
                <p className="text-2xl font-black leading-tight text-white">
                  {stat.value}
                </p>
                <p className="text-sm text-slate-300">{stat.label}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section
        className="relative z-10 mx-auto max-w-[1040px] px-4 py-4 sm:px-6"
        id="features"
      >
        <SectionLabel>Features</SectionLabel>
        <h2 className="mt-2 text-center text-2xl font-black tracking-tight text-white sm:text-3xl">
          Built for Scale. Designed for Developers.
        </h2>

        <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {featureCards.map((feature) => (
            <article
              className="rounded-lg border border-white/12 bg-white/[0.045] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] backdrop-blur"
              key={feature.title}
            >
              <div className="flex gap-4">
                <div className="flex size-16 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500/20 to-violet-600/25 text-cyan-400 shadow-[0_0_24px_rgba(124,58,237,0.25)]">
                  <Icon name={feature.icon} className="size-9" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-violet-100">
                    {feature.title}
                  </h3>
                  <p className="mt-1 text-sm leading-5 text-slate-300">
                    {feature.description}
                  </p>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section
        className="relative z-10 mx-auto max-w-[1040px] px-4 py-3 sm:px-6"
        id="how-it-works"
      >
        <SectionLabel>How It Works</SectionLabel>
        <div className="mt-4 grid gap-6 md:grid-cols-4">
          {steps.map((step, index) => (
            <div className="relative text-center" key={step.title}>
              {index < steps.length - 1 ? (
                <div className="absolute left-[60%] top-8 hidden w-[80%] border-t border-dashed border-slate-600 md:block" />
              ) : null}
              <div className="relative mx-auto mb-3 flex size-16 items-center justify-center rounded-full bg-blue-500/10 text-blue-400 shadow-[0_0_24px_rgba(37,99,235,0.18)]">
                <span className="absolute -left-1 -top-1 flex size-8 items-center justify-center rounded-full border border-cyan-200/60 bg-blue-600 text-sm font-black text-white">
                  {index + 1}
                </span>
                <Icon name={step.icon} className="size-8" />
              </div>
              <h3 className="text-base font-extrabold text-white">
                {step.title}
              </h3>
              <p className="mx-auto mt-2 max-w-[190px] text-sm leading-5 text-slate-300">
                {step.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section
        className="relative z-10 mx-auto grid max-w-[1200px] gap-5 px-4 py-8 sm:px-6 lg:grid-cols-[0.95fr_1.1fr_0.65fr]"
        id="docs"
      >
        <div className="self-center">
          <p className="text-xs font-extrabold uppercase tracking-[0.15em] text-cyan-400">
            Developer Friendly
          </p>
          <h2 className="mt-4 text-2xl font-black text-white sm:text-3xl">
            Simple APIs. Powerful Platform.
          </h2>
          <p className="mt-3 text-base leading-7 text-slate-300">
            Integrate in minutes and start sending events with our
            developer-first APIs.
          </p>
          <div className="mt-6 flex flex-wrap gap-3 text-xs font-bold text-slate-200">
            {["RESTful APIs", "JSON Payloads", "HTTPS Secure"].map((badge, index) => (
              <span
                className="inline-flex items-center gap-2 rounded-md border border-white/10 bg-white/[0.045] px-3 py-2"
                key={badge}
              >
                <Icon
                  name={index === 0 ? "link" : index === 1 ? "document" : "lock"}
                  className="size-4 text-cyan-400"
                />
                {badge}
              </span>
            ))}
          </div>
        </div>

        <div className="overflow-hidden rounded-lg border border-white/15 bg-[#07101f]/95 shadow-[0_0_30px_rgba(15,23,42,0.45)]">
          <div className="flex items-center justify-between border-b border-white/10 bg-white/[0.04] px-4 py-2.5">
            <p className="font-mono text-sm font-bold text-cyan-300">
              POST <span className="text-white">/v1/events</span>
            </p>
            <span className="rounded bg-white/5 px-2 py-1 text-[10px] text-slate-300">
              curl
            </span>
          </div>
          <pre className="overflow-x-auto p-4 text-[13px] leading-6 text-slate-300">
            <code>{`curl -X POST https://api.eventpulse.dev/v1/events \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "event": "UserLogin",
    "user_id": "user_123",
    "timestamp": "2025-05-20T11:45:00Z",
    "properties": {
      "ip": "203.0.113.42",
      "device": "Chrome / macOS"
    }
  }'`}</code>
          </pre>
        </div>

        <aside className="rounded-lg border border-white/15 bg-white/[0.045] p-5">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg bg-blue-500/15 text-cyan-400">
              <Icon name="shield" className="size-6" />
            </div>
            <h3 className="text-base font-extrabold text-white">
              Your API Key is Secure
            </h3>
          </div>
          <p className="mb-5 text-xs leading-5 text-slate-300">
            API keys are scoped per project and encrypted at rest. We never
            store your secrets in plain text.
          </p>
          <div className="space-y-3">
            {securityBullets.map((item) => (
              <p className="flex items-center gap-2 text-xs text-slate-200" key={item}>
                <span className="flex size-4 items-center justify-center rounded-full border border-emerald-400 text-emerald-300">
                  <Icon name="check" className="size-3" />
                </span>
                {item}
              </p>
            ))}
          </div>
        </aside>
      </section>

      <section className="relative z-10 mx-auto max-w-[1200px] px-4 pb-5 sm:px-6">
        <div className="rounded-xl border border-blue-400/35 bg-gradient-to-r from-blue-700/55 via-indigo-700/45 to-purple-800/55 px-7 py-6 shadow-[0_0_38px_rgba(37,99,235,0.22)]">
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-5">
              <div className="hidden size-16 items-center justify-center rounded-full bg-blue-500/15 text-blue-300 sm:flex">
                <Icon name="send" className="size-10" />
              </div>
              <div>
                <h2 className="text-2xl font-black text-white">
                  Ready to build smarter, more reliable systems?
                </h2>
                <p className="mt-2 text-sm text-slate-200">
                  Join thousands of developers monitoring millions of events in
                  real time.
                </p>
              </div>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <a
                className="inline-flex h-12 min-w-36 items-center justify-center gap-4 rounded-md bg-gradient-to-r from-cyan-400 to-blue-600 px-6 text-sm font-extrabold text-white"
                href="/signup"
              >
                Start Free
                <span aria-hidden="true">-&gt;</span>
              </a>
              <a
                className="inline-flex h-12 min-w-36 items-center justify-center rounded-md border border-white/20 bg-white/[0.04] px-6 text-sm font-extrabold text-white"
                href="#pricing"
              >
                View Pricing
              </a>
            </div>
          </div>
        </div>
      </section>

      <footer
        className="relative z-10 border-t border-white/10 bg-[#03101f]/70"
        id="contact"
      >
        <div className="mx-auto grid max-w-[1200px] gap-8 px-4 py-6 sm:px-6 md:grid-cols-[1.35fr_0.7fr_0.8fr_0.75fr_1.35fr]">
          <div>
            <div className="flex items-center gap-2">
              <LogoMark />
              <span className="text-2xl font-black text-white">EventPulse</span>
            </div>
            <p className="mt-4 max-w-64 text-sm leading-6 text-slate-300">
              Real-time event monitoring and alerting platform for modern
              applications.
            </p>
            <div className="mt-5 flex gap-4 text-slate-300">
              {["GH", "X", "in", "DC"].map((item) => (
                <span
                  className="flex size-6 items-center justify-center rounded-full bg-white/5 text-[10px] font-black"
                  key={item}
                >
                  {item}
                </span>
              ))}
            </div>
          </div>

          <FooterColumn
            title="Product"
            links={["Features", "How It Works", "Pricing", "Changelog"]}
          />
          <FooterColumn
            title="Developers"
            links={["Documentation", "API Reference", "SDKs", "Status Page"]}
          />
          <FooterColumn title="Company" links={["About Us", "Contact", "Careers", "Blog"]} />

          <div>
            <h3 className="text-sm font-extrabold text-white">
              Subscribe to updates
            </h3>
            <p className="mt-3 text-sm leading-6 text-slate-300">
              Get product updates and engineering insights straight to your
              inbox.
            </p>
            <form className="mt-4 flex overflow-hidden rounded-md border border-white/10 bg-white/[0.045]">
              <input
                aria-label="Email address"
                className="min-w-0 flex-1 bg-transparent px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500"
                placeholder="Enter your email"
                type="email"
              />
              <button
                aria-label="Subscribe"
                className="flex w-12 items-center justify-center bg-blue-600 text-white"
                type="button"
              >
                -&gt;
              </button>
            </form>
          </div>
        </div>

        <div className="border-t border-white/10">
          <div className="mx-auto flex max-w-[1200px] flex-col gap-3 px-4 py-4 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <p>&copy; 2025 EventPulse. All rights reserved.</p>
            <div className="flex gap-10">
              <a href="#">Privacy Policy</a>
              <a href="#">Terms of Service</a>
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}

function FooterColumn({ title, links }: { title: string; links: string[] }) {
  return (
    <div>
      <h3 className="text-sm font-extrabold text-white">{title}</h3>
      <div className="mt-3 space-y-2 text-sm text-slate-400">
        {links.map((link) => (
          <a className="block transition hover:text-cyan-300" href="#" key={link}>
            {link}
          </a>
        ))}
      </div>
    </div>
  );
}
