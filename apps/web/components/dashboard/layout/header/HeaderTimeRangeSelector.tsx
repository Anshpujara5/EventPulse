"use client";

import { Icon } from "@/components/common/Icon";
import { useOutsideClick } from "@/hooks/useOutsideClick";
import { useRef, useState } from "react";
import {
  TIME_RANGE_OPTIONS,
  useDashboardHeaderState,
} from "./DashboardHeaderContext";

export function HeaderTimeRangeSelector() {
  const { timeRange, setTimeRange } = useDashboardHeaderState();
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useOutsideClick(wrapperRef, () => setIsOpen(false), isOpen);

  const label =
    TIME_RANGE_OPTIONS.find((option) => option.value === timeRange)?.label ??
    "Last 24 hours";

  return (
    <div className="relative shrink-0" ref={wrapperRef}>
      <button
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        className="flex h-12 shrink-0 items-center gap-2 rounded-xl border border-slate-700/80 bg-slate-950/60 px-4 text-sm font-bold text-slate-200"
        onClick={() => setIsOpen((current) => !current)}
        type="button"
      >
        <Icon name="clock" className="size-4 text-slate-400" />
        {label}
        <span className="text-slate-500">⌄</span>
      </button>

      {isOpen ? (
        <div
          className="absolute left-0 top-full z-50 mt-3 w-56 overflow-hidden rounded-2xl border border-blue-500/55 bg-[#071426]/95 p-2 shadow-[0_24px_70px_rgba(0,0,0,0.42),0_0_28px_rgba(14,165,233,0.14)] backdrop-blur-xl"
          role="listbox"
        >
          {TIME_RANGE_OPTIONS.map((option) => {
            const isSelected = option.value === timeRange;

            return (
              <button
                aria-selected={isSelected}
                className={`flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-bold transition hover:bg-white/5 ${
                  isSelected ? "text-white" : "text-slate-300"
                }`}
                key={option.value}
                onClick={() => {
                  setTimeRange(option.value);
                  setIsOpen(false);
                }}
                role="option"
                type="button"
              >
                {option.label}
                {isSelected ? (
                  <Icon name="check" className="size-4 text-cyan-400" />
                ) : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
