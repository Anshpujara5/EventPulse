import { GlowCard } from "@/components/common/GlowCard";
import { categories } from "./dashboard-data";

export function EventCategoriesCard() {
  return (
    <GlowCard className="p-5">
      <h2 className="text-lg font-black">Event Categories</h2>
      <div className="mt-5 flex items-center gap-5">
        <div
          className="grid size-32 place-items-center rounded-full"
          style={{
            background:
              "conic-gradient(#22d3ee 0 32%,#3b82f6 32% 56%,#8b5cf6 56% 74%,#f43f5e 74% 88%,#f59e0b 88% 100%)",
          }}
        >
          <div className="grid size-20 place-items-center rounded-full bg-[#071426] text-center">
            <span className="text-xl font-black">125,842</span>
            <span className="-mt-4 text-xs text-slate-500">Total</span>
          </div>
        </div>
        <div className="flex-1 space-y-2">
          {categories.map(([name, percent, color]) => (
            <div className="flex items-center justify-between text-sm" key={name}>
              <span className="flex items-center gap-2 text-slate-300">
                <span className={`size-2 rounded-full ${color}`} />
                {name}
              </span>
              <span className="text-slate-400">{percent}</span>
            </div>
          ))}
        </div>
      </div>
    </GlowCard>
  );
}
