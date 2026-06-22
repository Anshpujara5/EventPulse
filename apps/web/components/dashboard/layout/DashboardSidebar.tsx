import { SidebarLogo } from "./sidebar/SidebarLogo";
import { SidebarNav } from "./sidebar/SidebarNav";
import { SidebarPlanCard } from "./sidebar/SidebarPlanCard";

export function DashboardSidebar() {
  return (
    <aside className="border-b border-slate-800/80 bg-[#061121]/95 lg:sticky lg:top-0 lg:h-screen lg:border-b-0 lg:border-r">
      <SidebarLogo />
      <SidebarNav />
      <div className="hidden px-4 lg:absolute lg:bottom-4 lg:left-0 lg:right-0 lg:block">
        <SidebarPlanCard />
        <div className="flex items-center justify-between px-3 py-2 text-sm font-bold text-slate-400">
          <span>Docs</span>
          <span>Support</span>
        </div>
      </div>
    </aside>
  );
}
