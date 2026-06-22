import { Icon } from "@/components/common/Icon";

export function SidebarNavItem({
  href,
  icon,
  isActive,
  item,
}: {
  href: string;
  icon: string;
  isActive: boolean;
  item: string;
}) {
  return (
    <a
      className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-bold transition ${
        isActive
          ? "border border-blue-400/40 bg-blue-600/35 text-white shadow-[0_0_24px_rgba(37,99,235,0.16)]"
          : "text-slate-400 hover:bg-white/4 hover:text-white"
      }`}
      href={href}
    >
      <Icon name={icon} className="size-5" />
      <span>{item}</span>
    </a>
  );
}
