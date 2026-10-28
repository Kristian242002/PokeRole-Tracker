"use client";

import { useMemo, useState, useTransition } from "react";
import { addToBiome, removeFromBiome, resetBiome, setRarity } from "@/lib/actions/biomes";
import { RARITIES, RARITY_LABEL, type BiomeCode, type Rarity } from "@/lib/biomes";
import { normalize } from "./Filters";
import { Sprite } from "./Sprite";
import { SuggestInput, type Suggestion } from "./SuggestInput";
import { typeStyle } from "./TypeBadge";

export interface BiomeView {
  code: BiomeCode;
  name: string;
  types: readonly string[];
  corrections: number;
  entries: {
    speciesId: string;
    rarity: Rarity;
    legendary: boolean;
    source: "auto" | "added";
    overridden: boolean;
  }[];
}

export interface SpeciesInfo {
  name: string;
  image: string;
  type: string;
  fanmade: boolean;
}

const PAGE = 40;

/** Pagina Biomi (§11.6): specie per bioma con rarità effettiva e correzioni del master. */
export function BiomesBrowser({
  campaignId,
  biomes,
  species,
}: {
  campaignId: string;
  biomes: BiomeView[];
  species: Record<string, SpeciesInfo>;
}) {
  const [open, setOpen] = useState<BiomeCode | null>(null);
  return (
    <div className="flex flex-col gap-3">
      {biomes.map((b) => {
        const counts = Object.fromEntries(
          RARITIES.map((r) => [r, b.entries.filter((e) => e.rarity === r).length]),
        ) as Record<Rarity, number>;
        const isOpen = open === b.code;
        return (
          <section key={b.code} className="card gap-0 p-0" aria-label={b.name}>
            <button
              type="button"
              className="flex w-full cursor-pointer items-center gap-3 border-0 bg-transparent p-3.5 text-left text-ink"
              aria-expanded={isOpen}
              onClick={() => setOpen(isOpen ? null : b.code)}
            >
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="font-display text-xl font-semibold">{b.name}</span>
                <span className="text-[13px] font-bold text-muted">
                  {b.types.join(", ")} · {counts.common} comuni · {counts.uncommon} non comuni ·{" "}
                  {counts.rare} rare
                  {b.corrections > 0 && ` · ${b.corrections} correzioni`}
                </span>
              </span>
              <span className="cnt">{b.entries.length} specie</span>
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.6"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d={isOpen ? "M6 15l6-6 6 6" : "M6 9l6 6 6-6"} />
              </svg>
            </button>
            {isOpen && <BiomeDetail campaignId={campaignId} biome={b} species={species} />}
          </section>
        );
      })}
    </div>
  );
}

function BiomeDetail({
  campaignId,
  biome,
  species,
}: {
  campaignId: string;
  biome: BiomeView;
  species: Record<string, SpeciesInfo>;
}) {
  const [query, setQuery] = useState("");
  const [add, setAdd] = useState("");
  const [shown, setShown] = useState(PAGE);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const included = useMemo(() => new Set(biome.entries.map((e) => e.speciesId)), [biome]);
  const idByName = useMemo(
    () => new Map(Object.entries(species).map(([id, s]) => [normalize(s.name), id])),
    [species],
  );
  const addOptions = useMemo<Suggestion[]>(
    () =>
      Object.entries(species)
        .filter(([id]) => !included.has(id))
        .map(([, s]) => ({
          value: s.name,
          hint: s.fanmade ? <span className="fan-badge">Fanmade</span> : undefined,
        })),
    [species, included],
  );
  const list = useMemo(() => {
    const q = normalize(query);
    const order = { common: 0, uncommon: 1, rare: 2 };
    return biome.entries
      .filter((e) => !q || normalize(species[e.speciesId]?.name ?? "").includes(q))
      .sort(
        (a, b) =>
          order[a.rarity] - order[b.rarity] ||
          (species[a.speciesId]?.name ?? "").localeCompare(species[b.speciesId]?.name ?? ""),
      );
  }, [biome, species, query]);

  function run(action: () => Promise<{ ok: boolean; error?: string }>) {
    start(async () => {
      const r = await action();
      setError(r.ok ? null : (r.error ?? "Operazione non riuscita"));
    });
  }

  function addSpecies(name: string) {
    const id = idByName.get(normalize(name));
    if (!id) return setError(`Nessuna specie chiamata "${name.trim()}"`);
    setAdd("");
    run(() => addToBiome(campaignId, biome.code, id));
  }

  return (
    <div className="flex flex-col gap-2.5 border-t-2 border-edge p-3.5">
      <div className="flex flex-col gap-2 lg:flex-row">
        <div className="min-w-0 flex-1">
          <label htmlFor={`add-${biome.code}`} className="label">
            Aggiungi specie
          </label>
          <SuggestInput
            id={`add-${biome.code}`}
            value={add}
            options={addOptions}
            placeholder="Cerca e premi Invio"
            onChange={(v) => {
              setAdd(v);
              setError(null);
            }}
            onPick={addSpecies}
          />
        </div>
        <div className="min-w-0 flex-1">
          <label htmlFor={`filter-${biome.code}`} className="label">
            Cerca nel bioma
          </label>
          <input
            id={`filter-${biome.code}`}
            type="search"
            className="sheet-field"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setShown(PAGE);
            }}
          />
        </div>
      </div>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      {list.length === 0 && <p className="m-0 text-muted">Nessuna specie.</p>}
      <ul className="m-0 flex flex-col gap-2 p-0">
        {list.slice(0, shown).map((e) => {
          const s = species[e.speciesId];
          const name = s?.name ?? e.speciesId;
          return (
            <li
              key={e.speciesId}
              className="flex flex-wrap items-center gap-2.5 rounded-[14px] border-2 border-edge bg-surface2 p-2.5"
            >
              <span
                className="tint grid size-11 flex-none place-items-center overflow-hidden rounded-xl border-2 border-edge"
                style={typeStyle(s?.type)}
              >
                <Sprite image={s?.image} name={name} size={38} />
              </span>
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate font-extrabold">{name}</span>
                <span className="flex flex-wrap gap-1">
                  {e.legendary && <span className="tag tag-warn">Leggendario</span>}
                  {e.source === "added" && <span className="tag tag-info">Aggiunta da te</span>}
                  {e.overridden && <span className="tag tag-info">Rarità cambiata</span>}
                  {s?.fanmade && <span className="fan-badge">Fanmade</span>}
                </span>
              </span>
              <div
                role="group"
                aria-label={`Rarità di ${name}`}
                className="segmented text-sm max-lg:w-full"
              >
                {RARITIES.map((r) => (
                  <button
                    key={r}
                    type="button"
                    className="min-h-10! px-2.5!"
                    aria-pressed={e.rarity === r}
                    disabled={pending}
                    onClick={() =>
                      e.rarity !== r && run(() => setRarity(campaignId, biome.code, e.speciesId, r))
                    }
                  >
                    {RARITY_LABEL[r]}
                  </button>
                ))}
              </div>
              <button
                type="button"
                className="btn btn-ghost h-10 px-3 text-sm"
                aria-label={`Togli ${name} da ${biome.name}`}
                disabled={pending}
                onClick={() => run(() => removeFromBiome(campaignId, biome.code, e.speciesId))}
              >
                Togli
              </button>
            </li>
          );
        })}
      </ul>
      {list.length > shown && (
        <button
          type="button"
          className="btn btn-ghost self-center"
          onClick={() => setShown((n) => n + PAGE)}
        >
          Mostra altri ({list.length - shown})
        </button>
      )}
      {biome.corrections > 0 && (
        <button
          type="button"
          className="btn btn-ghost self-start"
          disabled={pending}
          onClick={() => {
            if (window.confirm(`Ripristinare la tabella automatica di ${biome.name}?`)) {
              run(() => resetBiome(campaignId, biome.code));
            }
          }}
        >
          Ripristina l&apos;automatico
        </button>
      )}
    </div>
  );
}
