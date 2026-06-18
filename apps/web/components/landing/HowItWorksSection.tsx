import { Icon } from "@/components/common/Icon";
import { steps } from "./landing-data";
import { SectionLabel } from "./SectionLabel";

export function HowItWorksSection() {
  return (
    <section
      className="relative z-10 mx-auto max-w-260 px-4 py-3 sm:px-6"
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
            <p className="mx-auto mt-2 max-w-47.5 text-sm leading-5 text-slate-300">
              {step.description}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
