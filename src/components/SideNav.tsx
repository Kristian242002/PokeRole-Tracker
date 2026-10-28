"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "./Icon";
import { LogoMark } from "./Logo";
import { NAV_GAME, NAV_MASTER, isActive, type NavItem } from "./nav";

function NavLinks({ items, pathname }: { items: NavItem[]; pathname: string }) {
  return items.map((item) => (
    <Link
      key={item.href}
      href={item.href}
      className="side-link"
      aria-current={isActive(item, pathname) ? "page" : undefined}
    >
      <Icon name={item.icon} />
      {item.label}
    </Link>
  ));
}

/** Barra laterale rossa del design, visibile da desktop. */
export function SideNav({ account }: { account: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <aside
      aria-label="Menu principale"
      className="sticky top-0 hidden h-dvh w-[240px] flex-none flex-col gap-0.5 overflow-y-auto border-r-[3px] border-edge bg-red px-3.5 py-5 text-white lg:flex"
    >
      <Link
        href="/"
        className="flex items-center gap-2.5 px-1.5 pb-3 text-white no-underline hover:text-white"
      >
        <LogoMark />
        <span className="font-display text-[21px] leading-[1.05] font-semibold">
          Pokérole
          <br />
          Tracker
        </span>
      </Link>
      <nav aria-label="Gioco" className="flex flex-col gap-0.5">
        <span className="side-group">Gioco</span>
        <NavLinks items={NAV_GAME} pathname={pathname} />
      </nav>
      <nav aria-label="Master" className="flex flex-col gap-0.5">
        <span className="side-group">Master</span>
        <NavLinks items={NAV_MASTER} pathname={pathname} />
      </nav>
      <div className="mt-auto pt-4">{account}</div>
    </aside>
  );
}
