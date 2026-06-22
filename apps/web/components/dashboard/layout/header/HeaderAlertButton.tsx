import { Icon } from "@/components/common/Icon";

export function HeaderAlertButton() {
  return (
    <button className="relative flex size-12 items-center justify-center rounded-xl border border-slate-700/80 bg-slate-950/60 text-slate-200" type="button" aria-label="Alerts">
      <Icon name="bell" className="size-5" />
      <span className="absolute -right-1 -top-1 flex size-5 items-center justify-center rounded-full bg-rose-500 text-[11px] font-black text-white shadow-[0_0_14px_rgba(244,63,94,0.45)]">
        3
      </span>
    </button>
  );
}
