import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { DashboardOverview } from "@/components/dashboard/DashboardOverview";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";

export default function DashboardPage() {
  return (
    <main className="min-h-screen bg-[#020814] text-white">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_20%_0%,rgba(14,165,233,0.16),transparent_30%),radial-gradient(circle_at_82%_14%,rgba(124,58,237,0.16),transparent_28%)]" />
      <div className="relative grid min-h-screen lg:grid-cols-[240px_1fr]">
        <DashboardSidebar />

        <section className="min-w-0">
          <DashboardHeader />
          <DashboardOverview />
        </section>
      </div>
    </main>
  );
}
