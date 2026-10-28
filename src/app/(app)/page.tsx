import Link from "next/link";
import { Icon } from "@/components/Icon";
import { NAV_GAME, NAV_MASTER } from "@/components/nav";
import { PageHeader } from "@/components/PageHeader";

// Home provvisoria: dalla Fase 1 "/" reindirizza a /pokemon/miei o /login (§10).
export default function HomePage() {
  return (
    <>
      <PageHeader title="Pokérole Tracker" subtitle="Schede per Pokérole 3.0" />
      <main className="flex flex-col gap-4 p-4 lg:px-8 lg:py-5">
        <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-4">
          {[...NAV_GAME, ...NAV_MASTER].map((item) => (
            <Link key={item.href} href={item.href} className="card flex items-center gap-3 p-4">
              <span className="menu-icon bg-accent-soft text-ink">
                <Icon name={item.icon} />
              </span>
              <span className="font-display text-xl font-semibold">{item.label}</span>
            </Link>
          ))}
        </div>
      </main>
    </>
  );
}
