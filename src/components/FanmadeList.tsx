"use client";

import Link from "next/link";
import { useState } from "react";
import { PageHeader } from "./PageHeader";
import { Sprite } from "./Sprite";
import { TypeBadges, typeStyle } from "./TypeBadge";

export interface FanmadeListEntry {
  id: string;
  name: string;
  number: number;
  types: string[];
  image: string;
  shared: boolean;
  /** Nome utente dell'autore (solo "Del gruppo"). */
  author?: string;
}

/** Elenco fanmade (§10.9, design 9) con le due schede "Creati da te" / "Del gruppo". */
export function FanmadeList({
  mine,
  group,
}: {
  mine: FanmadeListEntry[];
  group: FanmadeListEntry[];
}) {
  const [tab, setTab] = useState<"mine" | "group">("mine");
  const list = tab === "mine" ? mine : group;
  const tabs = [
    ["mine", `Creati da te (${mine.length})`],
    ["group", `Del gruppo (${group.length})`],
  ] as const;

  return (
    <>
      <PageHeader
        title="Pokémon fanmade"
        subtitle="Specie inventate da te e dal tuo gruppo"
        back={{ href: "/altro", label: "Torna al menu" }}
        actions={
          <Link href="/fanmade/nuovo" className="btn btn-blue hidden lg:inline-flex">
            + Crea un Pokémon fanmade
          </Link>
        }
      >
        <div role="group" aria-label="Quali fanmade mostrare" className="segmented lg:max-w-md">
          {tabs.map(([value, label]) => (
            <button
              key={value}
              type="button"
              aria-pressed={tab === value}
              onClick={() => setTab(value)}
            >
              {label}
            </button>
          ))}
        </div>
      </PageHeader>
      <main className="flex flex-col gap-3 p-4 lg:px-8 lg:pt-4 lg:pb-10">
        <Link href="/fanmade/nuovo" className="btn btn-blue w-full lg:hidden">
          + Crea un Pokémon fanmade
        </Link>
        {list.length === 0 ? (
          <p className="panel m-0 max-w-xl text-[15px] font-bold text-muted">
            {tab === "mine"
              ? "Non hai ancora creato fanmade: inizia con “Crea un Pokémon fanmade”."
              : "Nessun fanmade condiviso dagli altri giocatori."}
          </p>
        ) : (
          <ul className="grid gap-3 lg:grid-cols-[repeat(auto-fill,minmax(340px,1fr))] lg:gap-4">
            {list.map((f) => (
              <li key={f.id} className="card flex items-center gap-3 p-3">
                <Link
                  href={`/dex/${f.id}`}
                  className="flex min-w-0 flex-1 items-center gap-3 text-ink no-underline hover:text-ink"
                  aria-label={`Apri ${f.name} nel Pokédex`}
                >
                  <span
                    className="tint grid size-[68px] flex-none place-items-center overflow-hidden rounded-[14px] border-2 border-edge"
                    style={typeStyle(f.types[0])}
                  >
                    <Sprite key={f.image} image={f.image} name={f.name} size={60} />
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col gap-1.5">
                    <span className="flex items-baseline gap-2">
                      <span className="truncate font-display text-xl font-semibold">{f.name}</span>
                      {f.number > 0 && (
                        <span className="text-xs font-extrabold text-muted">
                          #{String(f.number).padStart(4, "0")}
                        </span>
                      )}
                    </span>
                    <TypeBadges types={f.types} />
                    <span className="flex flex-wrap items-center gap-1.5">
                      <span className={`tag ${f.shared ? "tag-ok" : "tag-mut"}`}>
                        {f.shared ? "Visibile a tutti" : "Solo tu"}
                      </span>
                      {f.author && (
                        <span className="text-[13px] font-bold text-muted">di {f.author}</span>
                      )}
                    </span>
                  </span>
                </Link>
                {tab === "mine" && (
                  <Link
                    href={`/fanmade/${f.id}`}
                    className="btn btn-ghost h-11 flex-none px-3 text-sm"
                    aria-label={`Modifica ${f.name}`}
                  >
                    Modifica
                  </Link>
                )}
              </li>
            ))}
          </ul>
        )}
      </main>
    </>
  );
}
