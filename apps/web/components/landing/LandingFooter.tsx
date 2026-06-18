import { EventPulseLogo } from "@/components/common/EventPulseLogo";
import { footerColumns, socialLinks } from "./landing-data";

export function LandingFooter() {
  return (
    <footer
      className="relative z-10 border-t border-white/10 bg-[#03101f]/70"
      id="contact"
    >
      <div className="mx-auto grid max-w-300 gap-8 px-4 py-6 sm:px-6 md:grid-cols-[1.35fr_0.7fr_0.8fr_0.75fr_1.35fr]">
        <div>
          <div className="flex items-center gap-2">
            <EventPulseLogo />
            <span className="text-2xl font-black text-white">EventPulse</span>
          </div>
          <p className="mt-4 max-w-64 text-sm leading-6 text-slate-300">
            Real-time event monitoring and alerting platform for modern
            applications.
          </p>
          <div className="mt-5 flex gap-4 text-slate-300">
            {socialLinks.map((item) => (
              <span
                className="flex size-6 items-center justify-center rounded-full bg-white/5 text-[10px] font-black"
                key={item}
              >
                {item}
              </span>
            ))}
          </div>
        </div>

        {footerColumns.map((column) => (
          <FooterColumn key={column.title} title={column.title} links={column.links} />
        ))}

        <div>
          <h3 className="text-sm font-extrabold text-white">
            Subscribe to updates
          </h3>
          <p className="mt-3 text-sm leading-6 text-slate-300">
            Get product updates and engineering insights straight to your
            inbox.
          </p>
          <form className="mt-4 flex overflow-hidden rounded-md border border-white/10 bg-white/4.5">
            <input
              aria-label="Email address"
              className="min-w-0 flex-1 bg-transparent px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500"
              placeholder="Enter your email"
              type="email"
            />
            <button
              aria-label="Subscribe"
              className="flex w-12 items-center justify-center bg-blue-600 text-white"
              type="button"
            >
              -&gt;
            </button>
          </form>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-300 flex-col gap-3 px-4 py-4 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p>&copy; 2025 EventPulse. All rights reserved.</p>
          <div className="flex gap-10">
            <a href="#">Privacy Policy</a>
            <a href="#">Terms of Service</a>
          </div>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({ title, links }: { title: string; links: string[] }) {
  return (
    <div>
      <h3 className="text-sm font-extrabold text-white">{title}</h3>
      <div className="mt-3 space-y-2 text-sm text-slate-400">
        {links.map((link) => (
          <a className="block transition hover:text-cyan-300" href="#" key={link}>
            {link}
          </a>
        ))}
      </div>
    </div>
  );
}
