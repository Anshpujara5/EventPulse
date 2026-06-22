"use client";

import { usePathname } from "next/navigation";
import { navItems } from "./sidebar-data";
import { SidebarNavItem } from "./SidebarNavItem";

export function SidebarNav() {
  const pathname = usePathname();

  return (
    <nav className="grid gap-1 px-4 py-3 sm:grid-cols-4 lg:block lg:space-y-2">
      {navItems.map(([item, icon, href]) => {
        const isActive =
          href === "/dashboard"
            ? pathname === href
            : pathname === href || pathname.startsWith(`${href}/`);

        return (
          <SidebarNavItem
            href={href}
            icon={icon}
            isActive={isActive}
            item={item}
            key={item}
          />
        );
      })}
    </nav>
  );
}
