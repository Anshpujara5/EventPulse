import Link from "next/link";
import { EventPulseLogo } from "@/components/common/EventPulseLogo";
import { Icon } from "@/components/common/Icon";
import { AuthBackground } from "./AuthBackground";
import { AuthBottomBenefits } from "./AuthBottomBenefits";
import { AuthBrandPanel } from "./AuthBrandPanel";
import { AuthFormPanel } from "./AuthFormPanel";
import type { ReactNode } from "react";
import type { StatItem, TextIconItem } from "./auth-data";

export function AuthPageShell({
  previewStats,
  benefits,
  heroDescription,
  children,
  cardIcon,
  cardIconClassName,
  cardIconWrapperClassName,
  cardClassName,
  cardTitle,
  cardTitleClassName,
  cardSubtitle,
  cardHeaderClassName,
  sectionClassName,
  orbClassName,
  benefitsGridClassName,
}: {
  previewStats: readonly StatItem[];
  benefits: readonly TextIconItem[];
  heroDescription: ReactNode;
  children: ReactNode;
  cardIcon: string;
  cardIconClassName: string;
  cardIconWrapperClassName: string;
  cardClassName: string;
  cardTitle: string;
  cardTitleClassName: string;
  cardSubtitle: string;
  cardHeaderClassName: string;
  sectionClassName: string;
  orbClassName: string;
  benefitsGridClassName: string;
}) {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#020814] px-4 py-8 text-white sm:px-8">
      <AuthBackground orbClassName={orbClassName} />

      <header className="relative z-10 mx-auto flex max-w-305 items-center justify-between">
        <Link className="flex items-center gap-3" href="/">
          <EventPulseLogo className="flex size-10 items-center justify-center" />
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

      <section className={sectionClassName}>
        <AuthBrandPanel
          benefits={benefits}
          benefitsGridClassName={benefitsGridClassName}
          heroDescription={heroDescription}
          previewStats={previewStats}
        />

        <AuthFormPanel
          cardClassName={cardClassName}
          cardHeaderClassName={cardHeaderClassName}
          cardIcon={cardIcon}
          cardIconClassName={cardIconClassName}
          cardIconWrapperClassName={cardIconWrapperClassName}
          cardSubtitle={cardSubtitle}
          cardTitle={cardTitle}
          cardTitleClassName={cardTitleClassName}
        >
          {children}
        </AuthFormPanel>
      </section>

      <AuthBottomBenefits />
    </main>
  );
}
