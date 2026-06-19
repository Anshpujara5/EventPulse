import { GlowCard } from "@/components/common/GlowCard";
import { timeLabels, trendLines } from "./analytics-data";

export function EventTrendsChart() {
  return (
    <GlowCard className="p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-black text-white">Event Trends</h2>
          <p className="mt-1 text-xs text-slate-500">Requests, signups, purchases, and errors.</p>
        </div>
        <div className="flex flex-wrap gap-4 text-xs font-bold">
          {trendLines.map((line) => (
            <span className="flex items-center gap-2 text-slate-300" key={line.label}>
              <span className={`h-1 w-5 rounded-full ${line.color.replace("text", "bg")}`} />
              {line.label}
            </span>
          ))}
        </div>
      </div>

      <div className="mt-5 overflow-hidden rounded-xl border border-slate-800/80 bg-slate-950/25 p-4">
        <svg className="h-64 w-full" preserveAspectRatio="none" viewBox="0 0 924 220">
          {[40, 80, 120, 160, 200].map((y) => (
            <line
              key={y}
              stroke="rgba(148,163,184,0.12)"
              strokeDasharray="6 6"
              x1="0"
              x2="924"
              y1={y}
              y2={y}
            />
          ))}
          {trendLines.map((line) => (
            <path
              className={`${line.color} drop-shadow-[0_0_8px_currentColor]`}
              d={line.path}
              fill="none"
              key={line.label}
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="3"
            />
          ))}
        </svg>
        <div className="grid grid-cols-9 text-xs text-slate-500">
          {timeLabels.map((label, index) => (
            <span className={index === timeLabels.length - 1 ? "text-right" : ""} key={label}>
              {label}
            </span>
          ))}
        </div>
      </div>
    </GlowCard>
  );
}
