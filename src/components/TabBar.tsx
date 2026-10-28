"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "./Icon";
import { NAV_TABS, isActive } from "./nav";

/** Barra di navigazione in basso, solo su telefono. */
export function TabBar() {
  const pathname = usePathname();
  // Nelle schede la barra in basso è quella di salvataggio (design).
  if (/^\/(pokemon\/(?!miei$)[^/]+|allenatori\/[^/]+|fanmade\/[^/]+)$/.test(pathname)) return null;
  return (
    <nav
      aria-label="Navigazione principale"
      className="fixed inset-x-0 bottom-0 z-20 flex border-t-[3px] border-edge bg-surface px-1 pt-1 pb-[max(12px,env(safe-area-inset-bottom))] lg:hidden"
    >
      {NAV_TABS.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className="tab-link"
          aria-current={isActive(item, pathname) ? "page" : undefined}
        >
          <span className="pill">
            <Icon name={item.icon} size={22} />
          </span>
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
