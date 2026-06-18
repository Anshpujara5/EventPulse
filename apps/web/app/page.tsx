import { CTASection } from "@/components/landing/CTASection";
import { DeveloperApiSection } from "@/components/landing/DeveloperApiSection";
import { FeaturesSection } from "@/components/landing/FeaturesSection";
import { HeroSection } from "@/components/landing/HeroSection";
import { HowItWorksSection } from "@/components/landing/HowItWorksSection";
import { LandingFooter } from "@/components/landing/LandingFooter";
import { LandingNavbar } from "@/components/landing/LandingNavbar";
import { StatsSection } from "@/components/landing/StatsSection";

export default function Home() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#020814] text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_12%,rgba(14,165,233,0.24),transparent_26%),radial-gradient(circle_at_80%_20%,rgba(88,28,135,0.24),transparent_30%)]" />
      <div className="pointer-events-none absolute inset-x-0 top-16 h-155 bg-[linear-gradient(rgba(59,130,246,0.09)_1px,transparent_1px),linear-gradient(90deg,rgba(59,130,246,0.09)_1px,transparent_1px)] bg-size-[82px_82px]" />

      <LandingNavbar />
      <HeroSection />
      <StatsSection />
      <FeaturesSection />
      <HowItWorksSection />
      <DeveloperApiSection />
      <CTASection />
      <LandingFooter />
    </main>
  );
}
