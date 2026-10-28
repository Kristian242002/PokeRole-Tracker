"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { TYPES } from "@/lib/rules";
import { ChipFilter, SearchField, Switch, normalize } from "./Filters";
import { PageHeader } from "./PageHeader";
import { Sprite } from "./Sprite";
import { TypeBadge, typeStyle } from "./TypeBadge";

export interface DexEntry {
  id: string;
  number: number;
  name: string;
  types: string[];
  image: string;
  fanmade: boolean;
}

const PAGE = 60;

const TYPE_OPTIONS = [
  { value: "all", label: "Tutti i tipi" },
  ...TYPES.map((t) => ({ value: t, label: t, type: t })),
];

export function dexNumber(entry: { number: number; fanmade: boolean }): string {
  if (entry.fanmade) return entry.number ? `Fanmade · #${pad(entry.number)}` : "Fanmade";
  return `#${pad(entry.number)}`;
}

function pad(n: number) {
  return String(n).padStart(4, "0");
}

function matches(entry: DexEntry, query: string): boolean {
  if (!query) return true;
  const digits = query.replace(/^#/, "");
  if (/^\d+$/.test(digits))
    return !entry.fanmade && String(entry.number).includes(String(Number(digits)));
  return normalize(entry.name).includes(query);
}

/** Elenco del Pokédex con ricerca e filtri lato client (§10.1). */
export function DexBrowser({ entries }: { entries: DexEntry[] }) {
  const [query, setQuery] = useState("");
  const [type, setType] = useState("all");
  const [onlyFanmade, setOnlyFanmade] = useState(false);
  const [limit, setLimit] = useState(PAGE);

  const filtered = useMemo(() => {
    const q = normalize(query);
    return entries.filter(
      (e) =>
        (!onlyFanmade || e.fanmade) && (type === "all" || e.types.includes(type)) && matches(e, q),
    );
  }, [entries, query, type, onlyFanmade]);

  const fanmadeCount = entries.filter((e) => e.fanmade).length;
  const shown = filtered.slice(0, limit);
  const reset =
    <T,>(set: (v: T) => void) =>
    (v: T) => {
      set(v);
      setLimit(PAGE);
    };

  return (
    <>
      <PageHeader
        title="Pokédex"
        subtitle={`${filtered.length} di ${entries.length} specie${fanmadeCount ? ` · ${fanmadeCount} fanmade` : ""}`}
      >
        <div className="flex flex-col gap-3 text-ink lg:flex-row lg:flex-wrap lg:items-center lg:gap-4">
          <SearchField
            id="dex-q"
            label="Cerca nome o numero"
            value={query}
            onChange={reset(setQuery)}
            className="lg:w-[360px]"
          />
          <div className="text-white lg:text-ink">
            <Switch label="Solo fanmade" checked={onlyFanmade} onChange={reset(setOnlyFanmade)} />
          </div>
        </div>
        <ChipFilter
          label="Filtra per tipo"
          options={TYPE_OPTIONS}
          value={type}
          onChange={reset(setType)}
        />
      </PageHeader>
      <main className="flex flex-col gap-4 p-4 lg:px-8 lg:pt-4 lg:pb-10">
        {shown.length === 0 ? (
          <p className="py-12 text-center text-muted">
            Nessuna specie trovata: prova un altro nome o numero, oppure togli i filtri.
          </p>
        ) : (
          <ul className="grid grid-cols-3 gap-2.5 lg:grid-cols-[repeat(auto-fill,minmax(170px,1fr))] lg:gap-4">
            {shown.map((e) => (
              <li key={e.id} className="min-w-0">
                <DexCard entry={e} />
              </li>
            ))}
          </ul>
        )}
        {filtered.length > shown.length && (
          <button
            type="button"
            className="btn btn-plain self-center"
            onClick={() => setLimit((l) => l + PAGE)}
          >
            Mostra altri ({filtered.length - shown.length})
          </button>
        )}
      </main>
    </>
  );
}

function DexCard({ entry }: { entry: DexEntry }) {
  return (
    <Link
      href={`/dex/${entry.id}`}
      className="card relative flex h-full flex-col overflow-hidden rounded-[18px]"
    >
      <div
        className="tint relative grid h-[84px] place-items-center border-b-2 border-edge lg:h-[120px]"
        style={typeStyle(entry.types[0])}
      >
        <Sprite
          key={entry.image}
          image={entry.image}
          name={entry.name}
          size={104}
          fluid
          className="size-[72px] lg:size-[104px]"
        />
      </div>
      {/* Nel codice il nome viene prima del numero: è quello che legge per primo un lettore di schermo. */}
      <div className="flex flex-col gap-1 p-2 lg:px-3 lg:pt-2.5 lg:pb-3">
        <span className="truncate text-sm font-extrabold lg:text-[17px]">{entry.name}</span>
        <span className="order-first text-xs font-extrabold text-muted lg:text-[13px]">
          {entry.fanmade && !entry.number ? "Fanmade" : `#${pad(entry.number)}`}
        </span>
        <span className="flex flex-col items-start gap-[3px] lg:flex-row lg:flex-wrap lg:gap-1">
          {entry.types.map((t) => (
            <TypeBadge key={t} type={t} />
          ))}
        </span>
      </div>
      {entry.fanmade && <span className="fan-badge absolute top-1.5 left-1.5">Fanmade</span>}
    </Link>
  );
}
