import { AuthPageShell } from "@/components/auth/AuthPageShell";
import SignInForm from "./SignInForm";

const previewStats = [
  ["Events Ingested", "125,842", "12.8%"],
  ["Events / min", "2,094", "8.4%"],
  ["Active Alerts", "23", "3"],
] as const;

const benefits = [
  ["Secure by design", "Your data is encrypted and always protected.", "shield"],
  ["API-first", "Built for developers. Integrate in minutes.", "code"],
  ["Real-time alerts", "Instant notifications when it matters.", "bolt"],
] as const;

export default function SignInPage() {
  return (
    <AuthPageShell
      benefits={benefits}
      benefitsGridClassName="mt-4 grid gap-3 rounded-xl border border-white/10 bg-white/3.5 p-4 sm:grid-cols-3"
      cardClassName="mx-auto w-full max-w-130 rounded-3xl border border-slate-600/50 bg-slate-950/55 px-6 py-9 shadow-[0_0_60px_rgba(37,99,235,0.18)] backdrop-blur-xl sm:px-12"
      cardHeaderClassName="mt-6 text-center"
      cardIcon="lock"
      cardIconClassName="size-10"
      cardIconWrapperClassName="mx-auto flex size-20 items-center justify-center rounded-full border border-blue-500/40 bg-blue-600/10 text-cyan-400 shadow-[0_0_28px_rgba(37,99,235,0.34)]"
      cardSubtitle="Sign in to continue to EventPulse."
      cardTitle="Welcome back"
      cardTitleClassName="text-4xl font-black tracking-tight text-white"
      heroDescription={
        <>
          EventPulse helps developers and teams ingest, track, analyze, and alert
          on critical product and system events through powerful APIs.
        </>
      }
      orbClassName="pointer-events-none absolute left-[22%] top-20 h-140 w-140 rounded-full border border-blue-500/10 bg-[radial-gradient(circle,rgba(37,99,235,0.18),transparent_60%)]"
      previewStats={previewStats}
      sectionClassName="relative z-10 mx-auto mt-10 grid max-w-305 items-center gap-10 lg:grid-cols-[0.96fr_1.04fr]"
    >
      <SignInForm />
    </AuthPageShell>
  );
}
