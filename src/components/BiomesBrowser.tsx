"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import {
  addToBiome,
  loadBiome,
  removeFromBiome,
  resetBiome,
  setRarity,
  type BiomeSpeciesView,
} from "@/lib/actions/biomes";
import type { ActionResult } from "@/lib/actions/result";
import { RARITIES, RARITY_LABEL, type BiomeCode, type Rarity } from "@/lib/biomes";
import { normalize } from "./Filters";
import { Sprite } from "./Sprite";
import { SuggestInput, type Suggestion } from "./SuggestInput";
import { typeStyle } from "./TypeBadge";

/** Riepilogo di un bioma: le specie si caricano quando lo si apre. */
export interface BiomeSummary {
  code: BiomeCode;
  name: string;
  types: readonly string[];
  corrections: number;
  counts: Record<Rarity, number>;
  total: number;
}

const PAGE = 40;

/** Pagina Biomi (§11.6): specie per bioma con rarità effettiva e correzioni del master. */
export function BiomesBrowser({
  campaignId,
  biomes,
}: {
  campaignId: string;
  biomes: BiomeSummary[];
}) {
  const [open, setOpen] = useState<BiomeCode | null>(null);
  return (
    <div className="flex flex-col gap-3">
      {biomes.map((b) => {
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
                  {b.types.join(", ")} · {b.counts.common} comuni · {b.counts.uncommon} non comuni ·{" "}
                  {b.counts.rare} rare
                  {b.corrections > 0 && ` · ${b.corrections} correzioni`}
                </span>
              </span>
              <span className="cnt">{b.total} specie</span>
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
            {isOpen && <BiomeDetail campaignId={campaignId} biome={b} />}
          </section>
        );
      })}
    </div>
  );
}

type Loaded = {
  entries: BiomeSpeciesView[];
  addable: { id: string; name: string; fanmade: boolean }[];
};

function BiomeDetail({ campaignId, biome }: { campaignId: string; biome: BiomeSummary }) {
  const router = useRouter();
  const [data, setData] = useState<Loaded | null>(null);
  const [query, setQuery] = useState("");
  const [add, setAdd] = useState("");
  const [shown, setShown] = useState(PAGE);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  useEffect(() => {
    let alive = true;
    void loadBiome(campaignId, biome.code).then((r) => {
      if (!alive) return;
      if (r.ok) setData(r.data);
      else setError(r.error);
    });
    return () => {
      alive = false;
    };
  }, [campaignId, biome.code]);

  const idByName = useMemo(
    () => new Map((data?.addable ?? []).map((s) => [normalize(s.name), s.id])),
    [data],
  );
  const addOptions = useMemo<Suggestion[]>(
    () =>
      (data?.addable ?? []).map((s) => ({
        value: s.name,
        hint: s.fanmade ? <span className="fan-badge">Fanmade</span> : undefined,
      })),
    [data],
  );
  const list = useMemo(() => {
    const q = normalize(query);
    const order = { common: 0, uncommon: 1, rare: 2 };
    return (data?.entries ?? [])
      .filter((e) => !q || normalize(e.name).includes(q))
      .sort((a, b) => order[a.rarity] - order[b.rarity] || a.name.localeCompare(b.name));
  }, [data, query]);

  /** Esegue la correzione, poi ricarica il bioma e i riepiloghi della pagina. */
  function run(action: () => Promise<ActionResult>) {
    start(async () => {
      const r = await action();
      if (!r.ok) return setError(r.error);
      setError(null);
      const fresh = await loadBiome(campaignId, biome.code);
      if (fresh.ok) setData(fresh.data);
      router.refresh();
    });
  }

  function addSpecies(name: string) {
    const id = idByName.get(normalize(name));
    if (!id) return setError(`Nessuna specie chiamata "${name.trim()}"`);
    setAdd("");
    run(() => addToBiome(campaignId, biome.code, id));
  }

  if (!data) {
    return (
      <div className="border-t-2 border-edge p-3.5">
        {error ? (
          <p className="form-error" role="alert">
            {error}
          </p>
        ) : (
          <p className="m-0 text-muted" role="status">
            Carico le specie…
          </p>
        )}
      </div>
    );
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
        {list.slice(0, shown).map((e) => (
          <li
            key={e.speciesId}
            className="flex flex-wrap items-center gap-2.5 rounded-[14px] border-2 border-edge bg-surface2 p-2.5"
          >
            <span
              className="tint grid size-11 flex-none place-items-center overflow-hidden rounded-xl border-2 border-edge"
              style={typeStyle(e.type)}
            >
              <Sprite image={e.image} name={e.name} size={38} />
            </span>
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="truncate font-extrabold">{e.name}</span>
              <span className="flex flex-wrap gap-1">
                {e.legendary && <span className="tag tag-warn">Leggendario</span>}
                {e.source === "added" && <span className="tag tag-info">Aggiunta da te</span>}
                {e.overridden && <span className="tag tag-info">Rarità cambiata</span>}
                {e.fanmade && <span className="fan-badge">Fanmade</span>}
              </span>
            </span>
            <div
              role="group"
              aria-label={`Rarità di ${e.name}`}
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
              aria-label={`Togli ${e.name} da ${biome.name}`}
              disabled={pending}
              onClick={() => run(() => removeFromBiome(campaignId, biome.code, e.speciesId))}
            >
              Togli
            </button>
          </li>
        ))}
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
