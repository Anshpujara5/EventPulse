import { BillingPlanCard } from "./BillingPlanCard";
import { NotificationPreferencesCard } from "./NotificationPreferencesCard";
import { ProfileSettingsCard } from "./ProfileSettingsCard";
import { SecuritySettingsCard } from "./SecuritySettingsCard";
import { TeamMembersCard } from "./TeamMembersCard";
import { WorkspaceSettingsCard } from "./WorkspaceSettingsCard";

export function SettingsOverview() {
  return (
    <div className="mx-auto max-w-[1240px] px-4 py-6 sm:px-6">
      {/* Page header */}
      <div className="mb-6">
        <h1 className="text-2xl font-black tracking-tight text-white">Settings</h1>
        <p className="mt-1 text-sm text-slate-500">
          Manage your profile, workspace, team, and preferences.
        </p>
      </div>

      {/* Row 1 — Profile + Workspace */}
      <div className="grid gap-4 xl:grid-cols-[1fr_1.35fr]">
        <ProfileSettingsCard />
        <WorkspaceSettingsCard />
      </div>

      {/* Row 2 — Team Members */}
      <div className="mt-4">
        <TeamMembersCard />
      </div>

      {/* Row 3 — Security · Notifications · Billing */}
      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <SecuritySettingsCard />
        <NotificationPreferencesCard />
        <BillingPlanCard />
      </div>
    </div>
  );
}
