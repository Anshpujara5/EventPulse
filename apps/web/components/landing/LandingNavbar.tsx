import { EventPulseLogo } from "@/components/common/EventPulseLogo";
import { navLinks } from "./landing-data";

export function LandingNavbar() {
  return (
    <header className="relative z-20 border-b border-white/10 bg-[#030b19]/80 backdrop-blur-xl">
      <nav className="mx-auto flex h-15.5 max-w-300 items-center justify-between px-4 sm:px-6">
        <a className="flex items-center gap-2" href="#" aria-label="EventPulse home">
          <EventPulseLogo />
          <span className="text-2xl font-extrabold tracking-tight">EventPulse</span>
        </a>

        <div className="hidden items-center gap-10 text-sm font-semibold text-slate-200 lg:flex">
          {navLinks.map((link) => (
            <a
              className="transition hover:text-cyan-300"
              href={`#${link.toLowerCase().replaceAll(" ", "-")}`}
              key={link}
            >
              {link}
            </a>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <a
            className="hidden rounded-lg border border-violet-400/35 bg-white/2 px-6 py-2.5 text-sm font-bold text-white transition hover:border-cyan-300/50 sm:inline-flex"
            href="/signin"
          >
            Sign In
          </a>
          <a
            className="rounded-lg bg-linear-to-r from-blue-600 to-cyan-400 px-5 py-2.5 text-sm font-extrabold text-white shadow-[0_0_24px_rgba(14,165,233,0.35)] transition hover:scale-[1.02]"
            href="/signup"
          >
            Get Started
          </a>
        </div>
      </nav>
    </header>
  );
}
