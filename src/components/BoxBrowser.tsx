"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ChipFilter, SearchField, normalize } from "./Filters";
import { PageHeader } from "./PageHeader";
import { Sprite } from "./Sprite";
import { TypeBadge, typeStyle } from "./TypeBadge";

export interface BoxEntry {
  id: string;
  name: string;
  species: string;
  types: string[];
  image: string;
  rank: string;
  trainerId: string;
  fanmade: boolean;
}

/** I miei Pokémon (§10.7): griglia unica, ricerca e filtro per allenatore. */
export function BoxBrowser({
  entries,
  trainers,
}: {
  entries: BoxEntry[];
  trainers: { id: string; name: string }[];
}) {
  const [query, setQuery] = useState("");
  const [trainer, setTrainer] = useState("all");

  const filtered = useMemo(() => {
    const q = normalize(query);
    return entries.filter(
      (e) =>
        (trainer === "all" || e.trainerId === trainer) &&
        (!q || normalize(e.name).includes(q) || normalize(e.species).includes(q)),
    );
  }, [entries, query, trainer]);

  const options = [
    { value: "all", label: `Tutti (${entries.length})` },
    ...trainers.map((t) => ({
      value: t.id,
      label: `${t.name} (${entries.filter((e) => e.trainerId === t.id).length})`,
    })),
  ];

  return (
    <>
      <PageHeader
        title="I miei Pokémon"
        subtitle={`${entries.length} Pokémon · ${trainers.length} ${trainers.length === 1 ? "allenatore" : "allenatori"}`}
      >
        {entries.length > 0 && (
          <>
            <SearchField
              id="box-q"
              label="Cerca soprannome o specie"
              value={query}
              onChange={setQuery}
              className="lg:w-[360px]"
            />
            {trainers.length > 1 && (
              <ChipFilter
                label="Filtra per allenatore"
                options={options}
                value={trainer}
                onChange={setTrainer}
              />
            )}
          </>
        )}
      </PageHeader>
      <main className="p-4 lg:px-8 lg:pt-4 lg:pb-10">
        {entries.length === 0 ? (
          <div className="panel max-w-xl text-[15px] font-bold text-muted">
            {trainers.length === 0 ? (
              <p className="m-0">
                Non hai ancora Pokémon. Prima <Link href="/allenatori">crea un allenatore</Link>,
                poi aggiungi i suoi Pokémon dalla sua scheda o dal <Link href="/dex">Pokédex</Link>.
              </p>
            ) : (
              <p className="m-0">
                Non hai ancora Pokémon: aggiungili dalla scheda di un allenatore o dal{" "}
                <Link href="/dex">Pokédex</Link> con il pulsante “+”.
              </p>
            )}
          </div>
        ) : filtered.length === 0 ? (
          <p className="py-12 text-center text-muted">Nessun Pokémon corrisponde alla ricerca.</p>
        ) : (
          <ul className="grid grid-cols-2 gap-3 lg:grid-cols-[repeat(auto-fill,minmax(200px,1fr))] lg:gap-4">
            {filtered.map((e) => (
              <li key={e.id} className="min-w-0">
                <Link
                  href={`/pokemon/${e.id}`}
                  className="card flex h-full flex-col overflow-hidden"
                  aria-label={`Apri la scheda di ${e.name}`}
                >
                  <div
                    className="tint relative grid h-28 place-items-center border-b-2 border-edge"
                    style={typeStyle(e.types[0])}
                  >
                    <Sprite key={e.image} image={e.image} name={e.species} size={96} />
                    {e.fanmade && (
                      <span className="fan-badge absolute top-2.5 left-2">Fanmade</span>
                    )}
                  </div>
                  <div className="flex flex-col gap-1.5 px-3 pt-2.5 pb-3">
                    <span className="truncate text-[17px] font-bold">{e.name}</span>
                    <span className="text-sm text-muted">
                      {e.species} · {e.rank}
                    </span>
                    <span className="flex flex-wrap gap-1">
                      {e.types.map((t) => (
                        <TypeBadge key={t} type={t} />
                      ))}
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
    </>
  );
}
