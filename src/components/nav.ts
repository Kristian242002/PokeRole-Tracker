export type IconName =
  "box" | "trainer" | "dex" | "move" | "item" | "fanmade" | "campaign" | "more" | "logout";

export interface NavItem {
  href: string;
  label: string;
  icon: IconName;
  /** Prefissi di rotta che rendono attiva la voce. */
  match: string[];
}

export const NAV_GAME: NavItem[] = [
  { href: "/pokemon/miei", label: "I miei Pokémon", icon: "box", match: ["/pokemon"] },
  { href: "/allenatori", label: "I miei allenatori", icon: "trainer", match: ["/allenatori"] },
  { href: "/dex", label: "Pokédex", icon: "dex", match: ["/dex"] },
  { href: "/mosse", label: "Mosse", icon: "move", match: ["/mosse"] },
  { href: "/strumenti", label: "Strumenti", icon: "item", match: ["/strumenti"] },
  { href: "/fanmade", label: "Fanmade", icon: "fanmade", match: ["/fanmade"] },
];

export const NAV_MASTER: NavItem[] = [
  { href: "/campagne", label: "Campagne", icon: "campaign", match: ["/campagne"] },
];

/** Barra in basso su telefono: le voci più usate al tavolo, il resto in "Altro". */
export const NAV_TABS: NavItem[] = [
  { href: "/pokemon/miei", label: "Pokémon", icon: "box", match: ["/pokemon"] },
  { href: "/allenatori", label: "Allenatori", icon: "trainer", match: ["/allenatori"] },
  { href: "/dex", label: "Pokédex", icon: "dex", match: ["/dex"] },
  { href: "/mosse", label: "Mosse", icon: "move", match: ["/mosse"] },
  {
    href: "/altro",
    label: "Altro",
    icon: "more",
    match: ["/altro", "/strumenti", "/fanmade", "/campagne"],
  },
];

export function isActive(item: NavItem, pathname: string): boolean {
  return item.match.some((p) => pathname === p || pathname.startsWith(p + "/"));
}
