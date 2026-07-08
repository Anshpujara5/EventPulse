import { Icon } from "@/components/common/Icon";
import { featureCards } from "./landing-data";
import { SectionLabel } from "./SectionLabel";

export function FeaturesSection() {
  return (
    <section
      className="relative z-10 mx-auto max-w-260 px-4 py-4 sm:px-6"
      id="features"
    >
      <SectionLabel>Features</SectionLabel>
      <h2 className="mt-2 text-center text-2xl font-black tracking-tight text-white sm:text-3xl">
        Built for Stores. Focused on Conversion.
      </h2>

      <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {featureCards.map((feature) => (
          <article
            className="rounded-lg border border-white/12 bg-white/4.5 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] backdrop-blur"
            key={feature.title}
          >
            <div className="flex gap-4">
              <div className="flex size-16 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-blue-500/20 to-violet-600/25 text-cyan-400 shadow-[0_0_24px_rgba(124,58,237,0.25)]">
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
  );
}
