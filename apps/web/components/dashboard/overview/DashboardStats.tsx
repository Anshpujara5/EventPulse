import { GlowCard } from "@/components/common/GlowCard";
import { Icon } from "@/components/common/Icon";
import type { DashboardSummary } from "./dashboard-types";

interface StatCard {
  label: string;
  value: number;
  icon: string;
  accent: string;
  bg: string;
}

function buildCards(summary: DashboardSummary): StatCard[] {
  return [
    {
      label: "Total Projects",
      value: summary.totalProjects,
      icon: "folder",
      accent: "text-cyan-400",
      bg: "border-cyan-400/20 bg-cyan-500/10",
    },
    {
      label: "Total API Keys",
      value: summary.totalApiKeys,
      icon: "key",
      accent: "text-blue-400",
      bg: "border-blue-400/20 bg-blue-500/10",
    },
    {
      label: "Active API Keys",
      value: summary.activeApiKeys,
      icon: "check",
      accent: "text-emerald-400",
      bg: "border-emerald-400/20 bg-emerald-500/10",
    },
    {
      label: "Revoked API Keys",
      value: summary.revokedApiKeys,
      icon: "lock",
      accent: "text-rose-400",
      bg: "border-rose-400/20 bg-rose-500/10",
    },
  ];
}

export function DashboardStats({ summary }: { summary: DashboardSummary }) {
  const cards = buildCards(summary);
  return (
    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => (
        <GlowCard className="p-5" key={card.label}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-slate-400">{card.label}</p>
              <p className="mt-3 text-4xl font-black tracking-tight text-white">
                {card.value.toLocaleString()}
              </p>
            </div>
            <div
              className={`flex size-10 items-center justify-center rounded-full border ${card.bg} ${card.accent}`}
            >
              <Icon name={card.icon} />
            </div>
          </div>
        </GlowCard>
      ))}
    </section>
  );
}
