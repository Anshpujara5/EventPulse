import { GlowCard } from "@/components/common/GlowCard";

export function EventVolumeChart() {
  return (
    <GlowCard className="p-5 lg:col-span-7">
      <div className="mb-3 flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-black text-white">Event Volume</h2>
          <p className="text-sm text-slate-500">Requests and errors across the last day</p>
        </div>
        <div className="flex items-center gap-4 text-xs text-slate-400">
          <span className="flex items-center gap-2">
            <span className="size-2 rounded-full bg-blue-400" />
            Requests
          </span>
          <span className="flex items-center gap-2">
            <span className="size-2 rounded-full bg-rose-400" />
            Errors
          </span>
        </div>
      </div>
      <div className="relative h-64 overflow-hidden rounded-xl bg-slate-950/45 p-4">
        <div className="absolute inset-x-4 top-8 border-t border-dashed border-slate-700/70" />
        <div className="absolute inset-x-4 top-20 border-t border-dashed border-slate-700/70" />
        <div className="absolute inset-x-4 top-32 border-t border-dashed border-slate-700/70" />
        <div className="absolute inset-x-4 top-44 border-t border-dashed border-slate-700/70" />
        <svg className="relative z-10 h-full w-full" viewBox="0 0 680 220" preserveAspectRatio="none">
          <path
            d="M0 185 C35 166 55 175 84 132 S142 150 172 92 235 154 274 116 336 86 382 117 438 166 486 128 544 82 590 130 636 150 680 112"
            fill="none"
            stroke="#0ea5e9"
            strokeLinecap="round"
            strokeWidth="3"
          />
          <path
            d="M0 204 C45 184 78 196 112 162 S178 185 216 148 276 184 318 160 382 190 426 154 492 185 534 165 604 190 680 166"
            fill="none"
            stroke="#f43f5e"
            strokeLinecap="round"
            strokeWidth="2.4"
          />
        </svg>
        <div className="absolute inset-x-6 bottom-3 flex justify-between text-xs text-slate-500">
          <span>19:00</span>
          <span>23:00</span>
          <span>03:00</span>
          <span>07:00</span>
          <span>11:00</span>
          <span>15:00</span>
          <span>Now</span>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-2 divide-x divide-slate-700/70 text-sm">
        <div>
          <p className="text-slate-500">Requests</p>
          <p className="text-2xl font-black text-white">42,982</p>
        </div>
        <div className="pl-6">
          <p className="text-slate-500">Errors</p>
          <p className="text-2xl font-black text-white">78 <span className="text-sm text-slate-500">(0.18%)</span></p>
        </div>
      </div>
    </GlowCard>
  );
}
