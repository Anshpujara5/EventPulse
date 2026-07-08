import { AuthPageShell } from "@/components/auth/AuthPageShell";
import SignUpForm from "./SignUpForm";

const previewStats = [
  ["Commerce Events", "125,842", "12.6%"],
  ["Add to Cart", "18,204", "8.4%"],
  ["Cart Abandonment", "63%", "2.1%"],
] as const;

const benefits = [
  ["Connect your store", "Organize each store or brand in its own workspace.", "folder"],
  ["Generate API keys", "Issue scoped keys to send commerce events securely.", "key"],
  ["Send commerce events", "Track product views, carts, checkouts and purchases.", "send"],
  ["See the shopper funnel", "Spot drop-offs, abandonment, and friction instantly.", "chart"],
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
      cardSubtitle="Start understanding your shoppers with EventPulse."
      cardTitle="Create your account"
      cardTitleClassName="text-3xl font-black tracking-tight text-white"
      heroDescription={
        <>
          Start tracking commerce events in minutes. Connect your store, generate
          API keys, send product view, cart, checkout and purchase events, and see
          where shoppers drop off.
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
