import { Icon } from "@/components/common/Icon";

export function CTASection() {
  return (
    <section className="relative z-10 mx-auto max-w-300 px-4 pb-5 sm:px-6">
      <div className="rounded-xl border border-blue-400/35 bg-linear-to-r from-blue-700/55 via-indigo-700/45 to-purple-800/55 px-7 py-6 shadow-[0_0_38px_rgba(37,99,235,0.22)]">
        <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-5">
            <div className="hidden size-16 items-center justify-center rounded-full bg-blue-500/15 text-blue-300 sm:flex">
              <Icon name="send" className="size-10" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-white">
                Ready to understand why shoppers don&apos;t buy?
              </h2>
              <p className="mt-2 text-sm text-slate-200">
                Built for e-commerce and quick-commerce teams who want to see
                drop-offs and grow conversion.
              </p>
            </div>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <a
              className="inline-flex h-12 min-w-36 items-center justify-center gap-4 rounded-md bg-linear-to-r from-cyan-400 to-blue-600 px-6 text-sm font-extrabold text-white"
              href="/signup"
            >
              Start Free
              <span aria-hidden="true">-&gt;</span>
            </a>
            <a
              className="inline-flex h-12 min-w-36 items-center justify-center rounded-md border border-white/20 bg-white/4 px-6 text-sm font-extrabold text-white"
              href="#pricing"
            >
              View Pricing
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
