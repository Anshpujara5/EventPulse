import { BillingPlanCard } from "./BillingPlanCard";
import { NotificationPreferencesCard } from "./NotificationPreferencesCard";
import { ProfileSettingsCard } from "./ProfileSettingsCard";
import { SecuritySettingsCard } from "./SecuritySettingsCard";
import { TeamMembersCard } from "./TeamMembersCard";
import { WorkspaceSettingsCard } from "./WorkspaceSettingsCard";

export function SettingsOverview() {
  return (
    <div className="mx-auto max-w-[1420px] px-4 py-5 sm:px-6">
      <div>
        <h1 className="text-3xl font-black tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-slate-400">
          Manage workspace, team, billing, security, and notification preferences.
        </p>
      </div>

      <section className="mt-6 grid gap-5 xl:grid-cols-[1fr_1fr_1.2fr]">
        <WorkspaceSettingsCard />
        <ProfileSettingsCard />
        <TeamMembersCard />
      </section>

      <section className="mt-5 grid gap-5 xl:grid-cols-3">
        <SecuritySettingsCard />
        <NotificationPreferencesCard />
        <BillingPlanCard />
      </section>
    </div>
  );
}
