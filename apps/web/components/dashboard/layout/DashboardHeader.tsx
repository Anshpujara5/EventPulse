import { AccountAvatarMenu } from "./header/AccountAvatarMenu";
import { HeaderAlertButton } from "./header/HeaderAlertButton";
import { HeaderCreateAlertButton } from "./header/HeaderCreateAlertButton";
import { HeaderProjectSelector } from "./header/HeaderProjectSelector";
import { HeaderSearch } from "./header/HeaderSearch";
import {
  HeaderTimeRangeSelector,
  HeaderTimeRangeSelectorFallback,
} from "./header/HeaderTimeRangeSelector";
import { Suspense } from "react";

export function DashboardHeader({
  userEmail,
  userName,
}: {
  userEmail?: string;
  userName?: string;
}) {
  return (
    <header className="sticky top-0 z-20 border-b border-slate-800/80 bg-[#020814]/85 px-4 py-4 backdrop-blur-xl sm:px-6">
      <div className="flex items-center gap-4 overflow-visible">
        <div className="flex min-w-0 flex-1 items-center gap-4">
          <HeaderSearch />
          <HeaderProjectSelector />
          <Suspense fallback={<HeaderTimeRangeSelectorFallback />}>
            <HeaderTimeRangeSelector />
          </Suspense>
        </div>
        <div className="ml-auto flex shrink-0 items-center gap-4">
          <HeaderAlertButton />
          <HeaderCreateAlertButton />
          <AccountAvatarMenu userEmail={userEmail} userName={userName} />
        </div>
      </div>
    </header>
  );
}
