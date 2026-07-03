"use client";

import { useRef, useState } from "react";
import { Icon } from "@/components/common/Icon";
import { useOutsideClick } from "@/hooks/useOutsideClick";

export type FilterOption = {
  value: string;
  label: string;
};

/**
 * Small reusable filter/sort dropdown matching the EventPulse dark
 * glassmorphism style. Closes on outside click and Escape.
 */
export function FilterDropdown({
  ariaLabel,
  icon,
  onChange,
  options,
  prefix,
  value,
  widthClassName = "min-w-[210px]",
}: {
  ariaLabel: string;
  icon?: string;
  onChange: (value: string) => void;
  options: FilterOption[];
  prefix?: string;
  value: string;
  widthClassName?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useOutsideClick(wrapperRef, () => setIsOpen(false), isOpen);

  const selected = options.find((option) => option.value === value);
  const label = selected?.label ?? options[0]?.label ?? "";

  return (
    <div className={`relative ${widthClassName}`} ref={wrapperRef}>
      <button
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-label={ariaLabel}
        className="flex h-12 w-full items-center justify-between gap-3 rounded-xl border border-slate-700/80 bg-slate-950/60 px-4 text-sm font-bold text-slate-300 transition hover:border-slate-500"
        onClick={() => setIsOpen((current) => !current)}
        type="button"
      >
        <span className="flex min-w-0 items-center gap-3">
          {icon ? (
            <Icon name={icon} className="size-4 shrink-0 text-cyan-400" />
          ) : null}
          <span className="truncate">
            {prefix ? <span className="text-slate-500">{prefix}</span> : null}
            {label}
          </span>
        </span>
        <span className="shrink-0 text-slate-500">⌄</span>
      </button>

      {isOpen ? (
        <div
          className="absolute left-0 top-full z-40 mt-2 w-full min-w-[200px] overflow-hidden rounded-2xl border border-blue-500/45 bg-[#071426]/95 p-2 shadow-[0_24px_70px_rgba(0,0,0,0.42),0_0_28px_rgba(14,165,233,0.14)] backdrop-blur-xl"
          role="listbox"
        >
          {options.map((option) => {
            const isSelected = option.value === value;

            return (
              <button
                aria-selected={isSelected}
                className={`flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-bold transition hover:bg-white/5 ${
                  isSelected ? "text-white" : "text-slate-300"
                }`}
                key={option.value}
                onClick={() => {
                  onChange(option.value);
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
