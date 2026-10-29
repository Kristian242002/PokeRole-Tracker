"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import {
  generatePokemon,
  saveGenerated,
  sendGenerated,
  type GeneratedView,
  type GeneratorRequest,
} from "@/lib/actions/generator";
import { BIOMES } from "@/lib/biomes";
import { genderLabel } from "@/lib/labels";
import {
  ATTRIBUTE_LABEL,
  POKEMON_ATTRIBUTES,
  POKEMON_SKILLS,
  RANKS,
  SOCIAL_ATTRIBUTES,
  skillKey,
} from "@/lib/rules";
import { AbilityInfo } from "./AbilityInfo";
import { AttributeDots } from "./AttributeDots";
import type { DexEntry } from "./DexBrowser";
import { Switch, normalize } from "./Filters";
import { RankLabel } from "./RankIcon";
import { Sprite } from "./Sprite";
import { SuggestInput, type Suggestion } from "./SuggestInput";
import { TypeBadges, typeStyle } from "./TypeBadge";
import { useLazyJson } from "./useLazyJson";

interface Target {
  id: string;
  name: string;
  user?: string;
}

interface Result {
  key: number;
  view: GeneratedView;
  /** Dopo Salva / Invia a…: dove è finito. */
  done?: { label: string; pokemonId: string };
}

const SOCIAL_LABEL: Record<string, string> = {
  tough: "Tough",
  cool: "Cool",
  beauty: "Beauty",
  cute: "Cute",
  clever: "Clever",
};

let nextKey = 1;

/** Generatore (§11.3–11.5): impostazioni, risultati con Rigenera / Salva / Invia a…. */
export function GeneratorPanel({
  campaignId,
  npcs,
  players,
}: {
  campaignId: string;
  npcs: Target[];
  players: Target[];
}) {
  const [settings, setSettings] = useState<GeneratorRequest>({
    biome: "forest",
    mode: "optimized",
    rankMin: "Starter",
    rankMax: "Rookie",
    quantity: 3,
    legendary: false,
    fanmade: false,
    hiddenAbility: false,
    speciesId: null,
  });
  const [speciesQuery, setSpeciesQuery] = useState("");
  const [speciesName, setSpeciesName] = useState<string | null>(null);
  const dex = useLazyJson<DexEntry[]>("/api/specie");
  const speciesOptions = useMemo<Suggestion[]>(
    () =>
      (dex.data ?? []).map((e) => ({
        value: e.name,
        hint: e.fanmade ? <span className="fan-badge">Fanmade</span> : undefined,
      })),
    [dex.data],
  );

  function pickSpecies(name: string) {
    const entry = dex.data?.find((e) => normalize(e.name) === normalize(name));
    if (!entry) return setError(`Nessuna specie chiamata "${name.trim()}"`);
    setError(null);
    setSpeciesQuery("");
    setSpeciesName(entry.name);
    set("speciesId", entry.id);
  }
  const [results, setResults] = useState<Result[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const set = <K extends keyof GeneratorRequest>(key: K, value: GeneratorRequest[K]) =>
    setSettings((s) => ({ ...s, [key]: value }));

  function run() {
    start(async () => {
      const r = await generatePokemon(campaignId, settings);
      if (!r.ok) return setError(r.error);
      setError(null);
      setResults(r.data.map((view) => ({ key: nextKey++, view })));
    });
  }

  /** Rigenera solo quel Pokémon, con le stesse impostazioni. */
  async function reroll(key: number) {
    const r = await generatePokemon(campaignId, { ...settings, quantity: 1 });
    if (!r.ok) return r.error;
    setResults((list) =>
      list.map((x) => (x.key === key ? { key: nextKey++, view: r.data[0] } : x)),
    );
    return null;
  }

  function markDone(key: number, done: Result["done"]) {
    setResults((list) => list.map((x) => (x.key === key ? { ...x, done } : x)));
  }

  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:gap-5">
      <section
        className="panel gap-3 lg:sticky lg:top-4 lg:w-[340px] lg:flex-none"
        aria-labelledby="gen-settings"
      >
        <h2 id="gen-settings" className="h2">
          Impostazioni
        </h2>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="gen-species" className="label">
            Pokémon specifico (facoltativo)
          </label>
          {speciesName ? (
            <div className="flex items-center gap-2 rounded-xl border-2 border-edge bg-warn-bg px-3 py-2">
              <span className="flex-1 font-extrabold" data-testid="gen-species">
                Solo {speciesName}
              </span>
              <button
                type="button"
                className="btn btn-ghost h-9 px-2.5 text-sm"
                onClick={() => {
                  setSpeciesName(null);
                  set("speciesId", null);
                }}
              >
                Togli
              </button>
            </div>
          ) : (
            <div onFocus={() => void dex.load()}>
              <SuggestInput
                id="gen-species"
                value={speciesQuery}
                options={speciesOptions}
                placeholder="Cerca per nome e premi Invio"
                onChange={(v) => {
                  setSpeciesQuery(v);
                  setError(null);
                }}
                onPick={pickSpecies}
              />
            </div>
          )}
          <span className="text-[13px] text-muted">
            {speciesName
              ? "Genero solo questa specie: bioma e rarità non contano."
              : "Lascia vuoto per pescare dal bioma."}
          </span>
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="gen-biome" className="label">
            Bioma
          </label>
          <select
            id="gen-biome"
            className="sheet-field"
            disabled={!!speciesName}
            value={settings.biome}
            onChange={(e) => set("biome", e.target.value as GeneratorRequest["biome"])}
          >
            {BIOMES.map((b) => (
              <option key={b.code} value={b.code}>
                {b.name}
              </option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-2.5">
          {(
            [
              ["rankMin", "Rank da"],
              ["rankMax", "Rank a"],
            ] as const
          ).map(([key, label]) => (
            <div key={key} className="flex flex-col gap-1.5">
              <label htmlFor={`gen-${key}`} className="label">
                {label}
              </label>
              <select
                id={`gen-${key}`}
                className="sheet-field"
                value={settings[key]}
                onChange={(e) => set(key, e.target.value as GeneratorRequest["rankMin"])}
              >
                {RANKS.map((r) => (
                  <option key={r}>{r}</option>
                ))}
              </select>
            </div>
          ))}
        </div>
        <div className="flex flex-col gap-1.5">
          <span id="gen-mode" className="label">
            Distribuzione punti
          </span>
          <div role="group" aria-labelledby="gen-mode" className="segmented">
            {(
              [
                ["random", "Casuale"],
                ["optimized", "Ottimizzato"],
              ] as const
            ).map(([mode, label]) => (
              <button
                key={mode}
                type="button"
                aria-pressed={settings.mode === mode}
                onClick={() => set("mode", mode)}
              >
                {label}
              </button>
            ))}
          </div>
          <span className="text-[13px] text-muted">
            {settings.mode === "optimized"
              ? "Mosse forti del suo tipo, poi attributi e skill che servono a usarle."
              : "Punti e mosse distribuiti a caso, nel rispetto del rank."}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="font-extrabold">Quantità</span>
          <div className="stp">
            <button
              type="button"
              aria-label="Meno Pokémon"
              disabled={settings.quantity <= 1}
              onClick={() => set("quantity", settings.quantity - 1)}
            >
              −
            </button>
            <output aria-label="Quantità">{settings.quantity}</output>
            <button
              type="button"
              aria-label="Più Pokémon"
              disabled={settings.quantity >= 6}
              onClick={() => set("quantity", settings.quantity + 1)}
            >
              +
            </button>
          </div>
        </div>
        <Switch
          label="Includi leggendari"
          checked={settings.legendary}
          onChange={(v) => set("legendary", v)}
        />
        <Switch
          label="Includi fanmade"
          checked={settings.fanmade}
          onChange={(v) => set("fanmade", v)}
        />
        <Switch
          label="Abilità nascosta possibile"
          checked={settings.hiddenAbility}
          onChange={(v) => set("hiddenAbility", v)}
        />
        <button type="button" className="btn w-full" onClick={run} disabled={pending}>
          {pending ? "Genero…" : "Genera"}
        </button>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
      </section>

      <section className="flex min-w-0 flex-1 flex-col gap-3" aria-labelledby="gen-results">
        <div className="flex items-center justify-between">
          <h2 id="gen-results" className="h2">
            Risultati
          </h2>
          {results.length > 0 && (
            <span className="text-sm font-extrabold text-muted">
              {results.length} Pokémon · non salvati finché non premi Salva o Invia a…
            </span>
          )}
        </div>
        {results.length === 0 && (
          <p className="panel m-0 text-muted">Scegli le impostazioni e premi “Genera”.</p>
        )}
        <div className="grid gap-4 lg:grid-cols-[repeat(auto-fill,minmax(340px,1fr))]">
          {results.map((r) => (
            <GeneratedCard
              key={r.key}
              result={r}
              campaignId={campaignId}
              npcs={npcs}
              players={players}
              onReroll={() => reroll(r.key)}
              onDone={(done) => markDone(r.key, done)}
            />
          ))}
        </div>
      </section>
    </div>
  );
}

function GeneratedCard({
  result,
  campaignId,
  npcs,
  players,
  onReroll,
  onDone,
}: {
  result: Result;
  campaignId: string;
  npcs: Target[];
  players: Target[];
  onReroll: () => Promise<string | null>;
  onDone: (done: Result["done"]) => void;
}) {
  const { view, done } = result;
  const p = view.pokemon;
  const [open, setOpen] = useState<"save" | "send" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const skills = POKEMON_SKILLS.map((s) => [s, p.skills[skillKey(s)] ?? 0] as const).filter(
    ([, v]) => v > 0,
  );

  function act(kind: "save" | "send", target: Target) {
    start(async () => {
      const r =
        kind === "save"
          ? await saveGenerated(campaignId, target.id, p)
          : await sendGenerated(campaignId, target.id, p);
      if (!r.ok) return setError(r.error);
      setError(null);
      setOpen(null);
      onDone({
        label: kind === "save" ? `Salvato su ${target.name}` : `Inviato a ${target.name}`,
        pokemonId: r.data.id,
      });
    });
  }

  const targets = open === "save" ? npcs : players;
  return (
    <article
      className="card gap-0 overflow-hidden p-0"
      aria-label={`${view.species.name} generato`}
    >
      <div
        className="tint flex items-center gap-3 border-b-2 border-edge p-3.5"
        style={typeStyle(view.species.types[0])}
      >
        <span className="grid size-16 flex-none place-items-center rounded-[14px] border-2 border-edge bg-surface">
          <Sprite
            key={view.species.image}
            image={view.species.image}
            name={view.species.name}
            size={58}
          />
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <span className="flex flex-wrap items-center gap-2">
            <span className="font-display text-[22px] leading-none font-semibold">
              {view.species.name}
            </span>
            {view.species.fanmade && <span className="fan-badge">Fanmade</span>}
          </span>
          <TypeBadges types={view.species.types} />
        </div>
        <RankLabel rank={p.rank} />
      </div>
      <div className="flex flex-col gap-3 p-3.5">
        <div className="grid grid-cols-3 gap-2 text-[15px]">
          <span className="flex flex-col">
            <span className="label-sm">Natura</span>
            <span className="font-extrabold">{p.nature}</span>
          </span>
          <span className="flex flex-col">
            <span className="label-sm">Genere</span>
            <span className="font-extrabold">
              {p.gender === "M" ? "♂" : p.gender === "F" ? "♀" : genderLabel("N")}
            </span>
          </span>
          <span className="flex flex-col">
            <span className="label-sm">HP · Will</span>
            <span className="font-extrabold">
              {view.hp} · {view.will}
            </span>
          </span>
        </div>
        {p.ability && <AbilityInfo name={p.ability} effect={view.abilityEffect || null} />}
        <div className="flex flex-col gap-1" aria-label="Attributi">
          {POKEMON_ATTRIBUTES.map((a) => (
            <div key={a} className="flex items-center gap-2">
              <span className="w-[84px] flex-none text-sm font-extrabold">
                {ATTRIBUTE_LABEL[a]}
              </span>
              <AttributeDots
                base={p.attributes[a]}
                max={Math.max(p.attributes[a], view.species.attributes[a]?.[1] ?? 0)}
                label={ATTRIBUTE_LABEL[a]}
                description={`${p.attributes[a]} su ${view.species.attributes[a]?.[1] ?? p.attributes[a]}`}
              />
              <span className="w-6 text-right text-xs font-extrabold text-muted">
                {p.attributes[a]}
              </span>
            </div>
          ))}
        </div>
        <p className="m-0 text-sm">
          <span className="label-sm">Sociali </span>
          {SOCIAL_ATTRIBUTES.map((s) => `${SOCIAL_LABEL[s]} ${p.social[s]}`).join(" · ")}
        </p>
        <p className="m-0 text-sm">
          <span className="label-sm">Skill </span>
          {skills.length ? skills.map(([s, v]) => `${s} ${v}`).join(" · ") : "nessuna"}
        </p>
        <div className="flex flex-wrap gap-1.5" aria-label="Mosse">
          {view.moves.length === 0 && <span className="text-sm text-muted">Nessuna mossa</span>}
          {view.moves.map((m) => (
            <span key={m.name} className="mc pr-3">
              <i style={{ background: `var(--color-type-${m.type.toLowerCase()})` }} />
              {m.name}
            </span>
          ))}
        </div>

        {done ? (
          <p className="m-0 flex flex-wrap items-center gap-2">
            <span className="tag tag-ok">✓ {done.label}</span>
            <Link href={`/pokemon/${done.pokemonId}`} className="text-sm font-extrabold">
              Apri la scheda
            </Link>
          </p>
        ) : (
          <>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="btn btn-ghost h-11 px-3.5"
                disabled={pending}
                onClick={() =>
                  start(async () => {
                    const e = await onReroll();
                    if (e) setError(e);
                  })
                }
              >
                Rigenera
              </button>
              <button
                type="button"
                className="btn h-11 px-3.5"
                aria-expanded={open === "save"}
                disabled={pending}
                onClick={() => setOpen(open === "save" ? null : "save")}
              >
                Salva
              </button>
              <button
                type="button"
                className="btn btn-blue h-11 px-3.5"
                aria-expanded={open === "send"}
                disabled={pending}
                onClick={() => setOpen(open === "send" ? null : "send")}
              >
                Invia a…
              </button>
            </div>
            {open && (
              <div
                role="group"
                aria-label={open === "save" ? "Salva su un tuo allenatore" : "Invia a un giocatore"}
                className="flex flex-col gap-1.5 rounded-[14px] border-2 border-edge bg-surface2 p-2.5"
              >
                <span className="label-sm">
                  {open === "save" ? "Salva su un tuo allenatore" : "Invia a un giocatore"}
                </span>
                {targets.length === 0 ? (
                  <span className="text-sm text-muted">
                    {open === "save"
                      ? "Nessun allenatore della campagna: creane uno nella pagina della campagna."
                      : "Nessun giocatore collegato."}
                  </span>
                ) : (
                  targets.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      className="btn btn-ghost h-11 justify-start text-sm"
                      disabled={pending}
                      onClick={() => act(open, t)}
                    >
                      {t.user ? `${t.name} (@${t.user})` : t.name}
                    </button>
                  ))
                )}
              </div>
            )}
          </>
        )}
        {error && (
          <p className="form-error text-sm" role="alert">
            {error}
          </p>
        )}
      </div>
    </article>
  );
}
