"use client";

import { Icon } from "@/components/common/Icon";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { getInitials } from "./header-utils";

export function AccountAvatarMenu({
  userEmail,
  userName,
}: {
  userEmail?: string;
  userName?: string;
}) {
  const router = useRouter();
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [isAccountOpen, setIsAccountOpen] = useState(false);
  const initials = getInitials(userName);
  const displayName = userName?.trim() || "User";
  const displayEmail = userEmail || "No email available";

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      if (!dropdownRef.current?.contains(event.target as Node)) {
        setIsAccountOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, []);

  function handleSignOut() {
    localStorage.removeItem("eventpulse_token");
    localStorage.removeItem("eventpulse_user");
    router.replace("/signin");
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        aria-expanded={isAccountOpen}
        aria-label="Account menu"
        className="flex size-12 items-center justify-center rounded-full border border-cyan-400/50 bg-slate-950 text-sm font-black text-white"
        onClick={() => setIsAccountOpen((current) => !current)}
        type="button"
      >
        {initials}
      </button>

      {isAccountOpen ? (
        <div className="absolute right-0 top-full z-50 mt-3 w-70 overflow-hidden rounded-2xl border border-blue-500/55 bg-[#071426]/95 shadow-[0_24px_70px_rgba(0,0,0,0.42),0_0_28px_rgba(14,165,233,0.14)] backdrop-blur-xl">
          <div className="flex items-center gap-4 border-b border-slate-800/80 px-5 py-4">
            <div className="flex size-14 shrink-0 items-center justify-center rounded-full border border-cyan-400 bg-slate-950 text-lg font-black text-white shadow-[0_0_24px_rgba(34,211,238,0.22)]">
              {initials}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-black text-white">{displayName}</p>
              <p className="truncate text-xs text-slate-400">{displayEmail}</p>
              <p className="mt-1 text-xs font-bold text-slate-200">Workspace Admin</p>
            </div>
          </div>

          <div className="border-b border-slate-800/80 px-2 py-2">
            <a
              className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-bold text-slate-300 transition hover:bg-white/5 hover:text-white"
              href="/dashboard/settings"
              onClick={() => setIsAccountOpen(false)}
            >
              <Icon name="user" className="size-5 text-slate-300" />
              Profile Settings
            </a>
            <a
              className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-bold text-slate-300 transition hover:bg-white/5 hover:text-white"
              href="/dashboard/settings"
              onClick={() => setIsAccountOpen(false)}
            >
              <Icon name="cube" className="size-5 text-slate-300" />
              Workspace Settings
            </a>
          </div>
          <div className="px-2 py-2">
            <button
              className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-bold text-rose-400 transition hover:bg-rose-500/10 hover:text-rose-200"
              onClick={handleSignOut}
              type="button"
            >
              <Icon name="send" className="size-5" />
              Sign out
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
