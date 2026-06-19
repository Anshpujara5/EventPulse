import { ApiKeyUsageCard } from "./ApiKeyUsageCard";
import { ApiTrafficCard } from "./ApiTrafficCard";
import { DashboardStats } from "./DashboardStats";
import { EventCategoriesCard } from "./EventCategoriesCard";
import { EventVolumeChart } from "./EventVolumeChart";
import { LiveEventStream } from "./LiveEventStream";
import { ProjectSummaryCard } from "./ProjectSummaryCard";
import { RecentActivityTable } from "./RecentActivityTable";
import { SystemHealthCard } from "./SystemHealthCard";

export function DashboardOverview() {
  return (
    <div className="mx-auto max-w-[1420px] px-4 py-5 sm:px-6">
      <div className="mb-4">
        <h1 className="text-3xl font-black tracking-tight">Dashboard</h1>
        <p className="mt-1 text-sm text-slate-400">Monitor your product events and system activity.</p>
      </div>

      <DashboardStats />

      <section className="mt-4 grid gap-4 lg:grid-cols-12">
        <EventVolumeChart />
        <LiveEventStream />
      </section>

      <section className="mt-4 grid gap-4 xl:grid-cols-[1.05fr_1fr_1.45fr_1.65fr]">
        <EventCategoriesCard />
        <SystemHealthCard />
        <ApiTrafficCard />
        <ProjectSummaryCard />
      </section>

      <section className="mt-4 grid gap-4 xl:grid-cols-[1.2fr_1fr]">
        <RecentActivityTable />
        <ApiKeyUsageCard />
      </section>
    </div>
  );
}
