import Link from "next/link";
import SignUpForm from "./SignUpForm";

const previewStats = [
  ["Events Ingested", "125,842", "12.6%"],
  ["Events / min", "2,094", "8.4%"],
  ["Active Alerts", "23", "3"],
];

const sidebarItems = [
  "Overview",
  "Events",
  "Alerts",
  "Analytics",
  "Servers",
  "API Keys",
  "Projects",
  "Settings",
];

const benefits = [
  ["Create projects", "Organize each app or product in its own workspace.", "folder"],
  ["Generate API keys", "Issue scoped keys for secure event ingestion.", "key"],
  ["Send events", "Track product actions through simple HTTPS requests.", "send"],
  ["View real-time analytics", "See activity, alerts, and trends instantly.", "chart"],
];

const bottomBenefits = [
  ["Real-time Monitoring", "Track and react instantly", "pulse"],
  ["Powerful APIs", "RESTful, GraphQL & Webhooks", "code"],
  ["Scalable Infrastructure", "Built to handle millions of events", "stack"],
  ["Developer Friendly", "Docs, SDKs & 24/7 support", "heart"],
];

function LogoMark() {
  return (
    <span className="flex size-10 items-center justify-center">
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

function Icon({ name, className = "size-5" }: { name: string; className?: string }) {
  const paths: Record<string, string> = {
    bolt: "m13 2-9 12h7l-1 8 9-12h-7l1-8Z",
    chart: "M4 17h3l2-4 4 2 4-7 3 3",
    check: "m5 12 4 4L19 6",
    code: "m8 8-4 4 4 4m8-8 4 4-4 4m-2-10-4 12",
    folder: "M3 6h7l2 2h9v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6Z",
    heart: "M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 1 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8Z",
    key: "M15 7a4 4 0 1 1-2.4 7.2L7 19.8H4.2V17l5.6-5.6A4 4 0 0 1 15 7Zm0 0h.01",
    pulse: "M4 12h3l2-6 4 12 3-8 2 4h2",
    send: "m21 3-7 18-4-8-8-4 19-6Z",
    shield: "M12 3 5 6v6c0 4.5 3 7.8 7 9 4-1.2 7-4.5 7-9V6l-7-3Z",
    stack: "m12 3 8 4-8 4-8-4 8-4Zm-8 8 8 4 8-4M4 15l8 4 8-4",
    user: "M20 21a8 8 0 0 0-16 0M12 12a5 5 0 1 0 0-10 5 5 0 0 0 0 10Z",
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

function DashboardPreview() {
  return (
    <div className="rounded-xl border border-slate-600/45 bg-slate-950/70 p-2 shadow-[0_0_35px_rgba(14,165,233,0.14)]">
      <div className="grid overflow-hidden rounded-lg border border-white/10 bg-[#06101f] md:grid-cols-[130px_1fr]">
        <aside className="hidden border-r border-white/10 bg-white/3.5 p-4 md:block">
          <div className="mb-5 flex items-center gap-2">
            <LogoMark />
            <span className="text-xs font-black text-white">EventPulse</span>
          </div>
          <div className="space-y-1.5">
            {sidebarItems.map((item, index) => (
              <div
                className={`rounded-md px-3 py-2 text-[11px] font-medium ${
                  index === 0
                    ? "bg-blue-600/70 text-white"
                    : "text-slate-300"
                }`}
                key={item}
              >
                {item}
              </div>
            ))}
          </div>
        </aside>

        <div className="p-4">
          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm font-black text-white">Overview</p>
            <span className="rounded-md border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] text-slate-300">
              Last 1 Hour
            </span>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            {previewStats.map(([label, value, trend], index) => (
              <div
                className="rounded-lg border border-white/10 bg-white/4.5 p-3"
                key={label}
              >
                <p className="text-[10px] text-slate-400">{label}</p>
                <p className="mt-2 text-xl font-black text-white">{value}</p>
                <p
                  className={`mt-1 text-[10px] ${
                    index === 2 ? "text-rose-300" : "text-emerald-300"
                  }`}
                >
                  {index === 2 ? "+" : "↑"} {trend}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-3 rounded-lg border border-white/10 bg-white/3.5 p-4">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs font-black text-white">Event Stream</p>
              <div className="flex gap-4 text-[10px] text-slate-400">
                <span className="text-cyan-300">Requests</span>
                <span className="text-rose-300">Errors</span>
              </div>
            </div>
            <svg className="h-24 w-full" viewBox="0 0 360 110">
              <path
                d="M0 86 C28 70 42 76 61 42 S99 74 124 54 158 84 188 48 223 75 250 52 292 76 360 57"
                fill="none"
                stroke="#0ea5e9"
                strokeWidth="3"
              />
              <path
                d="M0 98 C35 90 48 96 72 74 S112 95 140 76 180 94 214 78 250 96 282 80 322 93 360 84"
                fill="none"
                stroke="#ec4899"
                strokeWidth="2"
              />
              <g className="fill-slate-500 text-[10px]">
                <text x="0" y="108">10:00</text>
                <text x="95" y="108">10:15</text>
                <text x="190" y="108">10:30</text>
                <text x="285" y="108">11:00</text>
              </g>
            </svg>
          </div>

          <div className="mt-3 grid gap-3 sm:grid-cols-[0.9fr_1fr]">
            <div className="rounded-lg border border-white/10 bg-white/3.5 p-3">
              <p className="mb-3 text-xs font-black text-white">
                Event Categories
              </p>
              <div className="flex items-center gap-3">
                <div
                  className="size-16 rounded-full"
                  style={{
                    background:
                      "conic-gradient(#0ea5e9 0 32%,#8b5cf6 32% 56%,#ec4899 56% 74%,#22c55e 74% 88%,#f59e0b 88% 100%)",
                  }}
                >
                  <div className="m-4 size-8 rounded-full bg-[#06101f]" />
                </div>
                <div className="flex-1 space-y-1 text-[10px] text-slate-300">
                  {["Auth 32%", "Payments 24%", "API 18%", "Errors 14%"].map(
                    (item) => (
                      <p key={item}>{item}</p>
                    ),
                  )}
                </div>
              </div>
            </div>
            <div className="rounded-lg border border-white/10 bg-white/3.5 p-3">
              <p className="mb-3 text-xs font-black text-white">System Health</p>
              <div className="space-y-2 text-[11px]">
                {["Ingestion", "Processing", "Alerts", "Database"].map((item) => (
                  <p className="flex items-center justify-between" key={item}>
                    <span className="text-slate-300">{item}</span>
                    <span className="rounded bg-emerald-400/10 px-1.5 py-0.5 text-[9px] font-black text-emerald-300">
                      Healthy
                    </span>
                  </p>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SignUpPage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#020814] px-4 py-8 text-white sm:px-8">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(14,165,233,0.22),transparent_28%),radial-gradient(circle_at_87%_42%,rgba(79,70,229,0.22),transparent_32%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(59,130,246,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(59,130,246,0.06)_1px,transparent_1px)] bg-size-[84px_84px]" />
      <div className="pointer-events-none absolute left-[22%] top-20 h-[560px] w-[560px] rounded-full border border-blue-500/10 bg-[radial-gradient(circle,rgba(37,99,235,0.18),transparent_60%)]" />

      <header className="relative z-10 mx-auto flex max-w-[1220px] items-center justify-between">
        <Link className="flex items-center gap-3" href="/">
          <LogoMark />
          <span className="text-2xl font-black tracking-tight sm:text-3xl">
            EventPulse
          </span>
        </Link>
        <div className="hidden items-center gap-3 text-sm text-slate-300 sm:flex">
          <Icon name="shield" className="size-5" />
          Trusted by developers & teams worldwide
          <span className="size-2 rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.9)]" />
        </div>
      </header>

      <section className="relative z-10 mx-auto mt-8 grid max-w-[1220px] items-center gap-10 lg:grid-cols-[0.96fr_1.04fr]">
        <div className="hidden lg:block">
          <h1 className="max-w-[520px] text-5xl font-black leading-[1.12] tracking-tight">
            Monitor Every Event. React in{" "}
            <span className="bg-linear-to-r from-cyan-300 via-blue-500 to-violet-500 bg-clip-text text-transparent">
              Real Time.
            </span>
          </h1>
          <p className="mt-4 max-w-[430px] text-base leading-7 text-slate-300">
            Start tracking product events in minutes. Create projects, generate
            API keys, send events, and view real-time analytics.
          </p>

          <div className="mt-6">
            <DashboardPreview />
          </div>

          <div className="mt-4 grid gap-3 rounded-xl border border-white/10 bg-white/3.5 p-4 sm:grid-cols-2">
            {benefits.map(([title, description, icon]) => (
              <div className="flex gap-3" key={title}>
                <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-blue-500/15 text-cyan-400">
                  <Icon name={icon} />
                </div>
                <div>
                  <p className="text-sm font-black text-white">{title}</p>
                  <p className="mt-1 text-xs leading-5 text-slate-400">
                    {description}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-5 flex flex-wrap gap-5 text-sm text-slate-400">
            {["SOC 2 Type II Compliant", "GDPR Ready", "99.9% Uptime SLA"].map(
              (item) => (
                <span className="flex items-center gap-2" key={item}>
                  <Icon name="check" className="size-4 text-cyan-400" />
                  {item}
                </span>
              ),
            )}
          </div>
        </div>

        <section className="mx-auto w-full max-w-[520px] rounded-3xl border border-slate-600/50 bg-slate-950/55 px-6 py-8 shadow-[0_0_60px_rgba(37,99,235,0.18)] backdrop-blur-xl sm:px-12">
          <div className="mx-auto flex size-[72px] items-center justify-center rounded-full border border-blue-500/40 bg-blue-600/10 text-cyan-400 shadow-[0_0_28px_rgba(37,99,235,0.34)]">
            <Icon name="user" className="size-9" />
          </div>
          <div className="mt-5 text-center">
            <h2 className="text-3xl font-black tracking-tight text-white">
              Create your account
            </h2>
            <p className="mt-2 text-base text-slate-300">
              Start monitoring events with EventPulse.
            </p>
          </div>
          <SignUpForm />
        </section>
      </section>

      <section className="relative z-10 mx-auto mt-8 max-w-[1220px] rounded-2xl border border-white/10 bg-white/3.5 p-5 backdrop-blur">
        <div className="grid gap-5 md:grid-cols-[1.2fr_repeat(4,1fr)]">
          <div className="flex items-center gap-4">
            <div className="flex size-12 items-center justify-center rounded-full bg-blue-500/15 text-blue-300">
              <Icon name="bolt" className="size-7" />
            </div>
            <p className="max-w-52 text-lg font-semibold">
              Everything you need to ship reliable systems
            </p>
          </div>
          {bottomBenefits.map(([title, description, icon]) => (
            <div
              className="flex items-center gap-3 border-white/10 md:border-l md:pl-5"
              key={title}
            >
              <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-blue-500/10 text-cyan-400">
                <Icon name={icon} className="size-6" />
              </div>
              <div>
                <p className="text-sm font-black text-white">{title}</p>
                <p className="mt-1 text-xs text-slate-400">{description}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
