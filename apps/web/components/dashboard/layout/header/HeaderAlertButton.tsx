"use client";

import { Icon } from "@/components/common/Icon";
import { useOutsideClick } from "@/hooks/useOutsideClick";
import { useRef, useState } from "react";

export function HeaderAlertButton() {
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useOutsideClick(wrapperRef, () => setIsOpen(false), isOpen);

  return (
    <div className="relative" ref={wrapperRef}>
      <button
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        aria-label="Notifications"
        className="relative flex size-12 items-center justify-center rounded-xl border border-slate-700/80 bg-slate-950/60 text-slate-200"
        onClick={() => setIsOpen((current) => !current)}
        type="button"
      >
        <Icon name="bell" className="size-5" />
      </button>

      {isOpen ? (
        <div className="absolute right-0 top-full z-50 mt-3 w-80 overflow-hidden rounded-2xl border border-blue-500/55 bg-[#071426]/95 shadow-[0_24px_70px_rgba(0,0,0,0.42),0_0_28px_rgba(14,165,233,0.14)] backdrop-blur-xl">
          <div className="flex items-center justify-between border-b border-slate-800/80 px-5 py-4">
            <p className="text-sm font-black text-white">Notifications</p>
          </div>
          <div className="flex flex-col items-center justify-center gap-3 px-6 py-10 text-center">
            <div className="flex size-11 items-center justify-center rounded-full border border-slate-800/60 bg-slate-900/60 text-slate-600">
              <Icon name="bell" className="size-5" />
            </div>
            <p className="text-sm font-bold text-slate-300">
              No notifications yet.
            </p>
            <p className="max-w-[220px] text-xs leading-relaxed text-slate-500">
              You&apos;re all caught up. Alerts and system notifications will
              show up here once available.
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
