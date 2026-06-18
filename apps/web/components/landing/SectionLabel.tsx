import type { ReactNode } from "react";

export function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <p className="text-center text-xs font-extrabold uppercase tracking-[0.18em] text-cyan-400">
      {children}
    </p>
  );
}
