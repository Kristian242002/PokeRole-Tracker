import type { Metadata } from "next";
import Link from "next/link";
import { Icon } from "@/components/Icon";
import type { IconName } from "@/components/nav";
import { PageHeader } from "@/components/PageHeader";

export const metadata: Metadata = { title: "Altro" };

interface MenuEntry {
  href: string;
  label: string;
  hint?: string;
  icon: IconName;
  tint: string;
}

const GROUPS: { label: string; entries: MenuEntry[] }[] = [
  {
    label: "Dati di gioco",
    entries: [
      {
        href: "/strumenti",
        label: "Strumenti",
        hint: "Tasche, prezzi ed effetti",
        icon: "item",
        tint: "#fff1c2",
      },
      {
        href: "/fanmade",
        label: "Fanmade",
        hint: "Crea Pokémon inventati",
        icon: "fanmade",
        tint: "#ffe1e5",
      },
    ],
  },
  {
    label: "Master",
    entries: [
      {
        href: "/campagne",
        label: "Campagne",
        hint: "Giocatori, generatore e biomi",
        icon: "campaign",
        tint: "#e1ecfc",
      },
    ],
  },
  {
    label: "Account",
    entries: [{ href: "/login", label: "Accedi", icon: "logout", tint: "#eef1f6" }],
  },
];

/** Menu "Altro" del telefono: le voci che non stanno nella barra in basso. */
export default function AltroPage() {
  return (
    <>
      <PageHeader title="Altro" />
      <main className="flex flex-col gap-2.5 p-4 lg:max-w-xl lg:px-8">
        {GROUPS.map((group) => (
          <section key={group.label} className="flex flex-col gap-2.5" aria-label={group.label}>
            <span className="group-label">{group.label}</span>
            <nav className="menu-list" aria-label={group.label}>
              {group.entries.map((e) => (
                <Link key={e.href} href={e.href} className="menu-item">
                  <span className="menu-icon" style={{ background: e.tint }}>
                    <Icon name={e.icon} />
                  </span>
                  <span className="flex-1">
                    {e.label}
                    {e.hint && <small>{e.hint}</small>}
                  </span>
                </Link>
              ))}
            </nav>
          </section>
        ))}
      </main>
    </>
  );
}
