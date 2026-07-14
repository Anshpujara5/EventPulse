"use client";

import {
  getTodayIsoDate,
  validateAnalyticsDateRange,
} from "@/lib/analyticsDateRange";
import { useEffect, useRef, useState, type FormEvent } from "react";

interface CustomDateRangePickerProps {
  initialFrom?: string;
  initialTo?: string;
  onApply: (from: string, to: string) => void;
  onCancel: () => void;
}

export function CustomDateRangePicker({
  initialFrom,
  initialTo,
  onApply,
  onCancel,
}: CustomDateRangePickerProps) {
  const today = getTodayIsoDate();
  const [from, setFrom] = useState(initialFrom ?? today);
  const [to, setTo] = useState(initialTo ?? today);
  const [error, setError] = useState<string | null>(null);
  const fromInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fromInputRef.current?.focus();
  }, []);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const validation = validateAnalyticsDateRange(from, to, today);

    if (!validation.valid) {
      setError(validation.message);
      return;
    }

    setError(null);
    onApply(validation.value.from, validation.value.to);
  }

  return (
    <form className="p-3" onSubmit={handleSubmit}>
      <div>
        <p className="text-sm font-black text-white">Custom date range</p>
        <p className="mt-1 text-xs leading-5 text-slate-400">
          Include every event received on the selected calendar days.
        </p>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="min-w-0 text-xs font-bold text-slate-300">
          Start date
          <input
            aria-describedby={error ? "custom-date-range-error" : undefined}
            className="mt-1.5 h-10 w-full min-w-0 rounded-lg border border-slate-700/80 bg-slate-950/80 px-3 text-sm text-white outline-none focus-visible:border-cyan-400 focus-visible:ring-2 focus-visible:ring-cyan-400/20"
            max={today}
            onChange={(event) => {
              setFrom(event.target.value);
              setError(null);
            }}
            ref={fromInputRef}
            required
            type="date"
            value={from}
          />
        </label>

        <label className="min-w-0 text-xs font-bold text-slate-300">
          End date
          <input
            aria-describedby={error ? "custom-date-range-error" : undefined}
            className="mt-1.5 h-10 w-full min-w-0 rounded-lg border border-slate-700/80 bg-slate-950/80 px-3 text-sm text-white outline-none focus-visible:border-cyan-400 focus-visible:ring-2 focus-visible:ring-cyan-400/20"
            max={today}
            onChange={(event) => {
              setTo(event.target.value);
              setError(null);
            }}
            required
            type="date"
            value={to}
          />
        </label>
      </div>

      {error ? (
        <p
          className="mt-3 text-xs font-semibold text-rose-300"
          id="custom-date-range-error"
          role="alert"
        >
          {error}
        </p>
      ) : null}

      <div className="mt-4 flex items-center justify-end gap-2 border-t border-slate-800/80 pt-3">
        <button
          className="rounded-lg border border-slate-700/80 px-3 py-2 text-xs font-bold text-slate-300 hover:bg-white/5 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/70"
          onClick={onCancel}
          type="button"
        >
          Cancel
        </button>
        <button
          className="rounded-lg bg-linear-to-r from-blue-600 to-cyan-500 px-3 py-2 text-xs font-black text-white shadow-[0_8px_24px_rgba(14,165,233,0.2)] hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/80"
          type="submit"
        >
          Apply range
        </button>
      </div>
    </form>
  );
}
