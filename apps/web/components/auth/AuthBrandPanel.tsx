import { Icon } from "@/components/common/Icon";
import { authTrustBadges, type StatItem, type TextIconItem } from "./auth-data";
import { AuthDashboardPreview } from "./AuthDashboardPreview";
import type { ReactNode } from "react";

export function AuthBrandPanel({
  previewStats,
  benefits,
  heroDescription,
  benefitsGridClassName,
}: {
  previewStats: readonly StatItem[];
  benefits: readonly TextIconItem[];
  heroDescription: ReactNode;
  benefitsGridClassName: string;
}) {
  return (
    <div className="hidden lg:block">
      <h1 className="max-w-125 text-5xl font-black leading-[1.12] tracking-tight">
        See Where Shoppers Drop Off. Convert in{" "}
        <span className="bg-linear-to-r from-cyan-300 via-blue-500 to-violet-500 bg-clip-text text-transparent">
          Real Time.
        </span>
      </h1>
      <p className="mt-4 max-w-107.5 text-base leading-7 text-slate-300">
        {heroDescription}
      </p>

      <div className="mt-6">
        <AuthDashboardPreview stats={previewStats} />
      </div>

      <div className={benefitsGridClassName}>
        {benefits.map(([title, description, icon]) => (
          <div className="flex gap-3" key={title}>
            <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-blue-500/15 text-cyan-400">
              <Icon name={icon} />
            </div>
            <div>
              <p className="text-sm font-black text-white">{title}</p>
              <p className="mt-1 text-xs leading-5 text-slate-400">
                {description}
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-5 flex flex-wrap gap-5 text-sm text-slate-400">
        {authTrustBadges.map((item) => (
          <span className="flex items-center gap-2" key={item}>
            <Icon name="check" className="size-4 text-cyan-400" />
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}
