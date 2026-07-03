"use client";

import { Icon } from "@/components/common/Icon";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

export function HeaderCreateAlertButton() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    document.addEventListener("keydown", handleKeyDown);

    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  return (
    <>
      <button
        className="h-12 rounded-xl bg-linear-to-r from-blue-600 to-violet-600 px-5 text-sm font-black text-white shadow-[0_0_24px_rgba(79,70,229,0.25)]"
        onClick={() => setIsOpen(true)}
        type="button"
      >
        Create Alert
      </button>

      {isOpen && typeof document !== "undefined"
        ? createPortal(
            <div
              aria-modal="true"
              className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/75 px-4 backdrop-blur-sm"
              onMouseDown={(event) => {
                if (event.target === event.currentTarget) {
                  setIsOpen(false);
                }
              }}
              role="dialog"
            >
              <div className="w-full max-w-md rounded-2xl border border-blue-500/40 bg-[#071426]/98 p-6 shadow-[0_24px_70px_rgba(0,0,0,0.5),0_0_28px_rgba(14,165,233,0.14)]">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="flex size-11 shrink-0 items-center justify-center rounded-full border border-violet-400/25 bg-violet-500/10 text-violet-300">
                      <Icon name="bell" className="size-5" />
                    </div>
                    <div>
                      <h2 className="text-lg font-black text-white">
                        Alerts coming soon
                      </h2>
                      <p className="mt-0.5 text-xs font-bold uppercase tracking-[0.18em] text-violet-300">
                        Not yet available
                      </p>
                    </div>
                  </div>
                  <button
                    aria-label="Close"
                    className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-slate-700/80 bg-slate-950/50 text-slate-400 transition hover:text-white"
                    onClick={() => setIsOpen(false)}
                    type="button"
                  >
                    ×
                  </button>
                </div>

                <p className="mt-4 text-sm leading-relaxed text-slate-400">
                  Alerting isn&apos;t connected to a backend yet, so alerts
                  can&apos;t be created or saved. Once the feature ships,
                  you&apos;ll be able to define threshold and anomaly alerts on
                  your event streams right here.
                </p>

                <div className="mt-6 flex justify-end">
                  <button
                    className="h-11 rounded-xl border border-slate-700/80 bg-slate-950/50 px-5 text-sm font-bold text-slate-300 transition hover:border-slate-500 hover:text-white"
                    onClick={() => setIsOpen(false)}
                    type="button"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
