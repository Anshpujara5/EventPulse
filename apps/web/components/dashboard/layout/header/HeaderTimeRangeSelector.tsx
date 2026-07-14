"use client";

import { Icon } from "@/components/common/Icon";
import { useOutsideClick } from "@/hooks/useOutsideClick";
import { validateAnalyticsDateRange } from "@/lib/analyticsDateRange";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useRef, useState } from "react";
import { CustomDateRangePicker } from "./CustomDateRangePicker";
import {
  TIME_RANGE_OPTIONS,
  type TimeRange,
  useDashboardHeaderState,
} from "./DashboardHeaderContext";

export function HeaderTimeRangeSelector() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { timeRange, setTimeRange } = useDashboardHeaderState();
  const [isOpen, setIsOpen] = useState(false);
  const [isEditingCustomRange, setIsEditingCustomRange] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  function closeMenu(restoreFocus = false) {
    setIsOpen(false);
    setIsEditingCustomRange(false);

    if (restoreFocus) {
      requestAnimationFrame(() => triggerRef.current?.focus());
    }
  }

  useOutsideClick(wrapperRef, () => closeMenu(), isOpen);

  const supportsCustomRange = pathname === "/dashboard/analytics";
  const isCustomRange =
    supportsCustomRange && searchParams.get("range") === "custom";
  const customRangeValidation = isCustomRange
    ? validateAnalyticsDateRange(
        searchParams.get("from"),
        searchParams.get("to"),
      )
    : null;

  const label = customRangeValidation?.valid
    ? customRangeValidation.value.label
    : isCustomRange
      ? "Custom range"
      : (TIME_RANGE_OPTIONS.find((option) => option.value === timeRange)?.label ??
        "Last 24 hours");

  function selectPreset(range: TimeRange) {
    setTimeRange(range);

    if (supportsCustomRange) {
      const params = new URLSearchParams(searchParams.toString());
      const hadCustomParams =
        params.has("range") || params.has("from") || params.has("to");

      params.delete("range");
      params.delete("from");
      params.delete("to");

      if (hadCustomParams) {
        const query = params.toString();
        router.push(`${pathname}${query ? `?${query}` : ""}`, {
          scroll: false,
        });
      }
    }

    closeMenu(true);
  }

  function applyCustomRange(from: string, to: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("range", "custom");
    params.set("from", from);
    params.set("to", to);

    router.push(`${pathname}?${params.toString()}`, { scroll: false });
    closeMenu(true);
  }

  return (
    <div className="relative shrink-0" ref={wrapperRef}>
      <button
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        className="flex h-12 shrink-0 items-center gap-2 rounded-xl border border-slate-700/80 bg-slate-950/60 px-4 text-sm font-bold text-slate-200"
        onClick={() => {
          setIsOpen((current) => !current);
          setIsEditingCustomRange(false);
        }}
        ref={triggerRef}
        type="button"
      >
        <Icon name="clock" className="size-4 text-slate-400" />
        <span className="max-w-44 truncate">{label}</span>
        <span className="text-slate-500">⌄</span>
      </button>

      {isOpen ? (
        <div
          className={`absolute right-0 top-full z-50 mt-3 overflow-hidden rounded-2xl border border-blue-500/55 bg-[#071426]/95 shadow-[0_24px_70px_rgba(0,0,0,0.42),0_0_28px_rgba(14,165,233,0.14)] backdrop-blur-xl ${
            isEditingCustomRange
              ? "w-[min(22rem,calc(100vw-2rem))]"
              : "w-56 p-2"
          }`}
        >
          {isEditingCustomRange ? (
            <CustomDateRangePicker
              initialFrom={
                customRangeValidation?.valid
                  ? customRangeValidation.value.from
                  : undefined
              }
              initialTo={
                customRangeValidation?.valid
                  ? customRangeValidation.value.to
                  : undefined
              }
              onApply={applyCustomRange}
              onCancel={() => closeMenu(true)}
            />
          ) : (
            <div role="listbox">
              {TIME_RANGE_OPTIONS.map((option) => {
                const isSelected = !isCustomRange && option.value === timeRange;

                return (
                  <button
                    aria-selected={isSelected}
                    className={`flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-bold transition hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/70 ${
                      isSelected ? "text-white" : "text-slate-300"
                    }`}
                    key={option.value}
                    onClick={() => selectPreset(option.value)}
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

              {supportsCustomRange ? (
                <button
                  aria-selected={isCustomRange}
                  className={`flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-bold transition hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/70 ${
                    isCustomRange ? "text-white" : "text-slate-300"
                  }`}
                  onClick={() => setIsEditingCustomRange(true)}
                  role="option"
                  type="button"
                >
                  Custom range
                  {isCustomRange ? (
                    <Icon name="check" className="size-4 text-cyan-400" />
                  ) : null}
                </button>
              ) : null}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}

export function HeaderTimeRangeSelectorFallback() {
  return (
    <div
      aria-hidden="true"
      className="flex h-12 shrink-0 items-center gap-2 rounded-xl border border-slate-700/80 bg-slate-950/60 px-4 text-sm font-bold text-slate-200"
    >
      <Icon name="clock" className="size-4 text-slate-400" />
      Last 24 hours
      <span className="text-slate-500">⌄</span>
    </div>
  );
}
