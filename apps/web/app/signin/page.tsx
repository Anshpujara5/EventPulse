import { AuthPageShell } from "@/components/auth/AuthPageShell";
import SignInForm from "./SignInForm";

const previewStats = [
  ["Commerce Events", "125,842", "12.8%"],
  ["Add to Cart", "18,204", "8.4%"],
  ["Cart Abandonment", "63%", "2.1%"],
] as const;

const benefits = [
  ["See where shoppers drop off", "Track product view → cart → checkout → purchase.", "chart"],
  ["Surface checkout friction", "Spot payment failures and abandonment fast.", "shield"],
  ["Rule-based insights", "Event-count analytics, no fake predictions.", "bolt"],
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
          Commerce analytics for e-commerce and quick-commerce stores. Understand
          where shoppers drop off, why carts are abandoned, and what drives
          purchases.
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
