"use client";

import { useMemo, useState, useTransition } from "react";
import { createPokemon } from "@/lib/actions/pokemon";
import type { DexEntry } from "./DexBrowser";
import { normalize } from "./Filters";
import { Sprite } from "./Sprite";
import { TypeBadge } from "./TypeBadge";

/** "Aggiungi Pokémon": ricerca nel Pokédex, crea il Pokémon e apre la scheda. */
export function AddPokemonPicker({
  trainerId,
  entries,
}: {
  trainerId: string;
  entries: DexEntry[];
}) {
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const results = useMemo(() => {
    const q = normalize(query);
    if (!q) return [];
    const digits = q.replace(/^#/, "");
    return entries
      .filter((e) =>
        /^\d+$/.test(digits)
          ? !e.fanmade && String(e.number) === String(Number(digits))
          : normalize(e.name).includes(q),
      )
      .slice(0, 8);
  }, [entries, query]);

  function add(speciesId: string) {
    setError(null);
    startTransition(async () => {
      const result = await createPokemon(trainerId, speciesId);
      if (result && !result.ok) setError(result.error);
    });
  }

  return (
    <div className="overflow-hidden rounded-[14px] border border-line bg-surface2">
      <label htmlFor="add-pokemon" className="flex h-[50px] items-center gap-2.5 px-3">
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.6"
          strokeLinecap="round"
          aria-hidden="true"
          className="flex-none text-muted"
        >
          <path d="M12 5v14M5 12h14" />
        </svg>
        <span className="sr-only">Aggiungi Pokémon</span>
        <input
          id="add-pokemon"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Aggiungi Pokémon · cerca nel Pokédex"
          autoComplete="off"
          className="h-12 min-w-0 flex-1 border-0 bg-transparent text-base outline-none"
          disabled={pending}
        />
      </label>
      {results.map((e) => (
        <button
          key={e.id}
          type="button"
          className="flex min-h-12 w-full cursor-pointer items-center gap-2.5 border-0 border-t border-line bg-transparent px-3 py-1.5 text-left text-[15px] hover:bg-surface"
          onClick={() => add(e.id)}
          disabled={pending}
        >
          <Sprite image={e.image} name={e.name} size={36} />
          <span className="flex-1 font-bold">
            {e.name}
            <span className="ml-1.5 font-normal text-muted">
              {e.fanmade ? "Fanmade" : `#${String(e.number).padStart(4, "0")}`}
            </span>
          </span>
          {e.types.map((t) => (
            <TypeBadge key={t} type={t} />
          ))}
        </button>
      ))}
      {pending && <p className="m-0 border-t border-line px-3 py-2 text-muted">Creazione…</p>}
      {error && (
        <p className="form-error m-2" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
