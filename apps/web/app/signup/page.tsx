import { AuthPageShell } from "@/components/AuthPageShell";
import SignUpForm from "./SignUpForm";

const previewStats = [
  ["Events Ingested", "125,842", "12.6%"],
  ["Events / min", "2,094", "8.4%"],
  ["Active Alerts", "23", "3"],
] as const;

const benefits = [
  ["Create projects", "Organize each app or product in its own workspace.", "folder"],
  ["Generate API keys", "Issue scoped keys for secure event ingestion.", "key"],
  ["Send events", "Track product actions through simple HTTPS requests.", "send"],
  ["View real-time analytics", "See activity, alerts, and trends instantly.", "chart"],
] as const;

export default function SignUpPage() {
  return (
    <AuthPageShell
      benefits={benefits}
      benefitsGridClassName="mt-4 grid gap-3 rounded-xl border border-white/10 bg-white/3.5 p-4 sm:grid-cols-2"
      cardClassName="mx-auto w-full max-w-[520px] rounded-3xl border border-slate-600/50 bg-slate-950/55 px-6 py-8 shadow-[0_0_60px_rgba(37,99,235,0.18)] backdrop-blur-xl sm:px-12"
      cardHeaderClassName="mt-5 text-center"
      cardIcon="user"
      cardIconClassName="size-9"
      cardIconWrapperClassName="mx-auto flex size-[72px] items-center justify-center rounded-full border border-blue-500/40 bg-blue-600/10 text-cyan-400 shadow-[0_0_28px_rgba(37,99,235,0.34)]"
      cardSubtitle="Start monitoring events with EventPulse."
      cardTitle="Create your account"
      cardTitleClassName="text-3xl font-black tracking-tight text-white"
      heroDescription={
        <>
          Start tracking product events in minutes. Create projects, generate API
          keys, send events, and view real-time analytics.
        </>
      }
      orbClassName="pointer-events-none absolute left-[22%] top-20 h-[560px] w-[560px] rounded-full border border-blue-500/10 bg-[radial-gradient(circle,rgba(37,99,235,0.18),transparent_60%)]"
      previewStats={previewStats}
      sectionClassName="relative z-10 mx-auto mt-8 grid max-w-305 items-center gap-10 lg:grid-cols-[0.96fr_1.04fr]"
    >
      <SignUpForm />
    </AuthPageShell>
  );
}
