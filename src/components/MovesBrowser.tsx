"use client";

import { useMemo, useState } from "react";
import { TYPES } from "@/lib/rules";
import { ChipFilter, SearchField, normalize } from "./Filters";
import { MoveRow, type MoveSummary } from "./MoveRow";
import { PageHeader } from "./PageHeader";

const PAGE = 60;

const TYPE_OPTIONS = [
  { value: "all", label: "Tutti" },
  ...TYPES.map((t) => ({ value: t, label: t, type: t })),
];

const CATEGORIES = [
  ["all", "Tutte"],
  ["Physical", "Fisica"],
  ["Special", "Speciale"],
  ["Support", "Supporto"],
] as const;

/** Elenco delle mosse con ricerca, filtri tipo e categoria, righe espandibili (§10.3). */
export function MovesBrowser({ moves }: { moves: MoveSummary[] }) {
  const [query, setQuery] = useState("");
  const [type, setType] = useState("all");
  const [category, setCategory] = useState("all");
  const [limit, setLimit] = useState(PAGE);

  const filtered = useMemo(() => {
    const q = normalize(query);
    return moves.filter(
      (m) =>
        (type === "all" || m.type === type) &&
        (category === "all" || m.category.split("/").includes(category)) &&
        (!q || normalize(m.name).includes(q)),
    );
  }, [moves, query, type, category]);

  const shown = filtered.slice(0, limit);
  const reset = (set: (v: string) => void) => (v: string) => {
    set(v);
    setLimit(PAGE);
  };

  return (
    <>
      <PageHeader title="Mosse" subtitle={`${filtered.length} di ${moves.length} mosse`}>
        <SearchField
          id="moves-q"
          label="Cerca mossa"
          value={query}
          onChange={reset(setQuery)}
          className="lg:w-[360px]"
        />
        <ChipFilter
          label="Filtra per tipo"
          options={TYPE_OPTIONS}
          value={type}
          onChange={reset(setType)}
        />
        <div
          className="segmented text-ink lg:self-start"
          role="group"
          aria-label="Filtra per categoria"
        >
          {CATEGORIES.map(([value, label]) => (
            <button
              key={value}
              type="button"
              aria-pressed={category === value}
              onClick={() => reset(setCategory)(value)}
            >
              {label}
            </button>
          ))}
        </div>
      </PageHeader>
      <main className="flex flex-col gap-2.5 p-4 lg:max-w-5xl lg:px-8 lg:pt-4 lg:pb-10">
        {shown.length === 0 ? (
          <p className="py-10 text-center text-muted">Nessuna mossa trovata.</p>
        ) : (
          shown.map((m) => <MoveRow key={m.id} move={m} showLearners />)
        )}
        {filtered.length > shown.length && (
          <button
            type="button"
            className="btn btn-plain self-center"
            onClick={() => setLimit((l) => l + PAGE)}
          >
            Mostra altre ({filtered.length - shown.length})
          </button>
        )}
      </main>
    </>
  );
}
