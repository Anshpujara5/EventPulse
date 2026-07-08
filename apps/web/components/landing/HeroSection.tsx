import { Icon } from "@/components/common/Icon";
import { DashboardPreview } from "./DashboardPreview";
import { heroTrust } from "./landing-data";

export function HeroSection() {
  return (
    <section className="relative z-10 mx-auto grid max-w-300 items-center gap-8 px-4 pb-5 pt-12 sm:px-6 lg:grid-cols-[0.82fr_1.18fr] lg:pt-16">
      <div className="relative">
        <div className="absolute -right-12 top-32 hidden h-56 w-56 rounded-full border border-blue-500/20 bg-[radial-gradient(circle,rgba(37,99,235,0.35),transparent_58%)] opacity-80 blur-sm lg:block" />
        <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-blue-400/40 bg-blue-500/10 px-4 py-2 text-sm text-blue-200 shadow-[0_0_24px_rgba(37,99,235,0.16)]">
          <span className="size-2 rounded-full bg-blue-500 shadow-[0_0_14px_rgba(59,130,246,0.95)]" />
          Commerce Analytics for E-commerce & Quick-commerce
        </div>

        <h1 className="max-w-135 text-[42px] font-black leading-[1.08] tracking-tight text-white sm:text-[58px] lg:text-[56px]">
          See Where Shoppers Drop Off. Grow{" "}
          <span className="bg-linear-to-r from-cyan-300 via-blue-500 to-violet-500 bg-clip-text text-transparent">
            Conversion.
          </span>
        </h1>
        <p className="mt-4 max-w-127.5 text-base leading-7 text-slate-300">
          EventPulse is commerce analytics for online stores. Track product
          views, carts, checkouts, purchases, and friction events to understand
          where shoppers abandon before buying.
        </p>

        <div className="mt-7 flex flex-col gap-4 sm:flex-row">
          <a
            className="inline-flex h-13 items-center justify-center gap-4 rounded-lg bg-linear-to-r from-cyan-400 via-blue-500 to-violet-600 px-9 text-base font-extrabold text-white shadow-[0_0_28px_rgba(37,99,235,0.34)]"
            href="/signup"
          >
            Start Free
            <span aria-hidden="true">-&gt;</span>
          </a>
          <a
            className="inline-flex h-13 items-center justify-center gap-4 rounded-lg border border-violet-400/45 bg-white/3 px-9 text-base font-extrabold text-white"
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

      <DashboardPreview />
    </section>
  );
}
