import { Icon } from "@/components/common/Icon";

export function HeaderProjectSelector() {
  return (
    <button className="flex h-12 shrink-0 items-center gap-2 rounded-xl border border-slate-700/80 bg-slate-950/60 px-4 text-sm font-bold text-slate-200" type="button">
      <Icon name="cube" className="size-4 text-cyan-400" />
      Production App
      <span className="text-slate-500">⌄</span>
    </button>
  );
}
