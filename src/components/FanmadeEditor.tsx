"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import { createFanmade, deleteFanmade, updateFanmade } from "@/lib/actions/fanmade";
import { EVOLUTION_KINDS, EVOLUTION_SPEEDS, GENDER_TYPES, type FanmadeInput } from "@/lib/fanmade";
import { KIND_LABEL, SPEED_LABEL, genderLabel } from "@/lib/labels";
import { ATTRIBUTE_LABEL, POKEMON_ATTRIBUTES, RANKS, TYPES } from "@/lib/rules";
import { AttributeDots } from "./AttributeDots";
import { normalize } from "./Filters";
import { ImageField } from "./ImageField";
import { DetailHeader } from "./PageHeader";
import { RankIcon } from "./RankIcon";
import { SuggestInput, type Suggestion } from "./SuggestInput";
import { TypeBadge, typeStyle } from "./TypeBadge";

export interface FanmadeEditorProps {
  /** Id specie (`fm-…`) se si modifica un fanmade esistente. */
  speciesId?: string;
  initial: FanmadeInput;
  userId: string;
  abilities: string[];
  moves: { name: string; type: string }[];
  /** Specie di arrivo possibili (ufficiali e fanmade visibili). */
  species: { name: string; fanmade: boolean }[];
}

type Ability = FanmadeInput["hiddenAbility"];
type Evo = FanmadeInput["evolutions"][number];

/** Editor fanmade (§10.9, design 9). */
export function FanmadeEditor(props: FanmadeEditorProps) {
  const router = useRouter();
  const [v, setV] = useState<FanmadeInput>(props.initial);
  const [saved, setSaved] = useState(JSON.stringify(props.initial));
  const [error, setError] = useState<string | null>(null);
  const [busy, startBusy] = useTransition();
  const dirty = JSON.stringify(v) !== saved;

  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const set = <K extends keyof FanmadeInput>(key: K, value: FanmadeInput[K]) => {
    setError(null);
    setV((s) => ({ ...s, [key]: value }));
  };

  const officialAbilities = useMemo(
    () => new Set(props.abilities.map((a) => a.toLowerCase())),
    [props.abilities],
  );
  const abilityOptions = useMemo<Suggestion[]>(
    () => props.abilities.map((a) => ({ value: a })),
    [props.abilities],
  );
  const speciesOptions = useMemo<Suggestion[]>(
    () =>
      props.species.map((s) => ({
        value: s.name,
        hint: s.fanmade ? <span className="fan-badge">Fanmade</span> : undefined,
      })),
    [props.species],
  );

  function save() {
    startBusy(async () => {
      const result = props.speciesId
        ? await updateFanmade(props.speciesId, v)
        : await createFanmade(v);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setSaved(JSON.stringify(v));
      router.push(`/dex/${result.data.id}`);
    });
  }

  function remove() {
    if (!props.speciesId) return;
    if (!window.confirm(`Eliminare ${v.name || "questo fanmade"}? Non si può annullare.`)) return;
    startBusy(async () => {
      setSaved(JSON.stringify(v));
      const result = await deleteFanmade(props.speciesId!);
      if (result && !result.ok) setError(result.error);
    });
  }

  const [t1, t2] = v.types;
  const abilities: Ability[] = [v.abilities[0] ?? blank(), v.abilities[1] ?? blank()];
  const setAbility = (i: number, a: Ability) => {
    const next = [...abilities];
    next[i] = a;
    set("abilities", next);
  };

  return (
    <>
      <DetailHeader
        eyebrow="Editor fanmade"
        title={v.name || "Nuovo fanmade"}
        back={{ href: "/fanmade", label: "Torna ai fanmade", section: "Fanmade" }}
      />
      <main className="grid gap-4 p-4 pb-28 lg:grid-cols-2 lg:items-start lg:gap-5 lg:px-8 lg:pt-4 lg:pb-8">
        <div className="flex min-w-0 flex-col gap-4 lg:gap-5">
          {/* IDENTITÀ */}
          <section className="panel" aria-labelledby="fm-identity">
            <h2 id="fm-identity" className="h2">
              Identità
            </h2>
            <ImageField
              kind="fanmade"
              userId={props.userId}
              name={v.name}
              value={v.image}
              onChange={(url) => set("image", url)}
              allowLink
              tileStyle={typeStyle(t1)}
            />
            <div className="grid grid-cols-[minmax(0,2fr)_minmax(0,1fr)] gap-2.5">
              <Field id="fm-name" label="Nome">
                <input
                  id="fm-name"
                  className="sheet-field"
                  value={v.name}
                  maxLength={40}
                  required
                  onChange={(e) => set("name", e.target.value)}
                />
              </Field>
              <Field id="fm-number" label="Numero">
                <input
                  id="fm-number"
                  className="sheet-field"
                  inputMode="numeric"
                  placeholder="facoltativo"
                  defaultValue={v.number ?? ""}
                  onChange={(e) => set("number", parseNumber(e.target.value, true))}
                />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <Field id="fm-t1" label="Tipo 1">
                <select
                  id="fm-t1"
                  className="sheet-field"
                  value={t1}
                  onChange={(e) =>
                    set("types", (t2 ? [e.target.value, t2] : [e.target.value]) as never)
                  }
                >
                  {TYPES.map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
              </Field>
              <Field id="fm-t2" label="Tipo 2">
                <select
                  id="fm-t2"
                  className="sheet-field"
                  value={t2 ?? ""}
                  onChange={(e) =>
                    set("types", (e.target.value ? [t1, e.target.value] : [t1]) as never)
                  }
                >
                  <option value="">Nessuno</option>
                  {TYPES.filter((t) => t !== t1).map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
              </Field>
            </div>
            <Field id="fm-category" label="Categoria">
              <input
                id="fm-category"
                className="sheet-field"
                placeholder="es. Lynx Pokémon"
                maxLength={60}
                value={v.category}
                onChange={(e) => set("category", e.target.value)}
              />
            </Field>
            <Field id="fm-desc" label="Descrizione">
              <textarea
                id="fm-desc"
                className="sheet-field min-h-24"
                rows={3}
                maxLength={2000}
                value={v.description}
                onChange={(e) => set("description", e.target.value)}
              />
            </Field>
            <div className="grid grid-cols-2 gap-2.5">
              <Field id="fm-rank" label="Rank consigliato">
                <div className="flex items-center gap-2">
                  <RankIcon rank={v.recommendedRank} size={28} />
                  <select
                    id="fm-rank"
                    className="sheet-field min-w-0 flex-1 px-2"
                    value={v.recommendedRank}
                    onChange={(e) => set("recommendedRank", e.target.value as never)}
                  >
                    {RANKS.map((r) => (
                      <option key={r}>{r}</option>
                    ))}
                  </select>
                </div>
              </Field>
              <Field id="fm-gender" label="Genere possibile">
                <select
                  id="fm-gender"
                  className="sheet-field"
                  value={v.genderType}
                  onChange={(e) => set("genderType", e.target.value as never)}
                >
                  {GENDER_TYPES.map((g) => (
                    <option key={g} value={g}>
                      {genderLabel(g)}
                    </option>
                  ))}
                </select>
              </Field>
              <Field id="fm-height" label="Altezza (m)">
                <input
                  id="fm-height"
                  className="sheet-field"
                  inputMode="decimal"
                  placeholder="facoltativa"
                  defaultValue={v.heightM ?? ""}
                  onChange={(e) => set("heightM", parseNumber(e.target.value))}
                />
              </Field>
              <Field id="fm-weight" label="Peso (kg)">
                <input
                  id="fm-weight"
                  className="sheet-field"
                  inputMode="decimal"
                  placeholder="facoltativo"
                  defaultValue={v.weightKg ?? ""}
                  onChange={(e) => set("weightKg", parseNumber(e.target.value))}
                />
              </Field>
            </div>
            <label className="flex cursor-pointer items-center gap-2.5 text-[15px] font-extrabold">
              <input
                type="checkbox"
                className="size-5 accent-[var(--red)]"
                checked={v.legendary}
                onChange={(e) => set("legendary", e.target.checked)}
              />
              Leggendario
            </label>
          </section>

          {/* ATTRIBUTI */}
          <section className="panel gap-2" aria-labelledby="fm-attrs">
            <h2 id="fm-attrs" className="h2">
              Attributi base e massimi
            </h2>
            <div className="flex items-center justify-between border-b-2 border-line pb-2">
              <span className="font-extrabold">HP base</span>
              <Stepper
                label="HP base"
                value={v.baseHP}
                min={1}
                max={20}
                onChange={(n) => set("baseHP", n)}
              />
            </div>
            {POKEMON_ATTRIBUTES.map((a) => {
              const [base, max] = v.attributes[a];
              const label = ATTRIBUTE_LABEL[a];
              const setPair = (b: number, m: number) =>
                set("attributes", { ...v.attributes, [a]: [b, m] });
              return (
                <div
                  key={a}
                  className="flex flex-col gap-2 border-b-2 border-line pb-2.5 last:border-0"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-[86px] flex-none font-extrabold">{label}</span>
                    <AttributeDots base={base} max={max} label={label} />
                  </div>
                  <div className="flex flex-wrap items-center gap-2.5">
                    <span className="label-sm">Base</span>
                    <Stepper
                      label={`base ${label}`}
                      value={base}
                      min={0}
                      max={10}
                      onChange={(b) => setPair(b, Math.max(b, max))}
                    />
                    <span className="label-sm ml-auto">Max</span>
                    <Stepper
                      label={`massimo ${label}`}
                      value={max}
                      min={0}
                      max={10}
                      onChange={(m) => setPair(Math.min(base, m), m)}
                    />
                  </div>
                </div>
              );
            })}
          </section>
        </div>

        <div className="flex min-w-0 flex-col gap-4 lg:gap-5">
          {/* ABILITÀ */}
          <section className="panel" aria-labelledby="fm-abilities">
            <h2 id="fm-abilities" className="h2">
              Abilità
            </h2>
            {(
              [
                ["fm-ab1", "Abilità 1", abilities[0], (a: Ability) => setAbility(0, a)],
                [
                  "fm-ab2",
                  "Abilità 2 (facoltativa)",
                  abilities[1],
                  (a: Ability) => setAbility(1, a),
                ],
                [
                  "fm-abh",
                  "Abilità nascosta (facoltativa)",
                  v.hiddenAbility,
                  (a: Ability) => set("hiddenAbility", a),
                ],
              ] as const
            ).map(([id, label, value, onChange]) => (
              <AbilityField
                key={id}
                id={id}
                label={label}
                value={value}
                official={!value.name || officialAbilities.has(value.name.trim().toLowerCase())}
                options={abilityOptions}
                onChange={onChange}
              />
            ))}
          </section>

          {/* MOSSE */}
          <MovesSection
            moves={v.moves}
            catalog={props.moves}
            onChange={(moves) => set("moves", moves)}
          />

          {/* EVOLUZIONI E VISIBILITÀ */}
          <section className="panel" aria-labelledby="fm-evos">
            <h2 id="fm-evos" className="h2">
              Evoluzioni e visibilità
            </h2>
            {v.evolutions.length === 0 && (
              <p className="m-0 text-muted">Nessuna evoluzione: è una forma finale.</p>
            )}
            {v.evolutions.map((e, i) => (
              <EvolutionRow
                key={i}
                index={i}
                value={e}
                options={speciesOptions}
                onChange={(next) =>
                  set(
                    "evolutions",
                    v.evolutions.map((x, j) => (j === i ? next : x)),
                  )
                }
                onRemove={() =>
                  set(
                    "evolutions",
                    v.evolutions.filter((_, j) => j !== i),
                  )
                }
              />
            ))}
            {v.evolutions.length < 10 && (
              <button
                type="button"
                className="addc self-start"
                onClick={() =>
                  set("evolutions", [
                    ...v.evolutions,
                    { to: "", kind: "Level", speed: "Medium", item: "" },
                  ])
                }
              >
                + Aggiungi evoluzione
              </button>
            )}
            <div className="flex items-center gap-3 border-t-2 border-line pt-3">
              <span className="flex flex-1 flex-col">
                <span id="fm-vis" className="font-extrabold">
                  Visibile a tutti i giocatori del sito
                </span>
                <span className="text-sm text-muted">
                  {v.shared ? "Tutti lo vedono nel Pokédex" : "Lo vedi solo tu"}
                </span>
              </span>
              <button
                type="button"
                role="switch"
                aria-checked={v.shared}
                aria-labelledby="fm-vis"
                className="switch"
                onClick={() => set("shared", !v.shared)}
              >
                <span />
              </button>
            </div>
          </section>

          {props.speciesId && (
            <section>
              <button type="button" className="btn btn-danger" onClick={remove} disabled={busy}>
                Elimina fanmade
              </button>
            </section>
          )}
        </div>
      </main>

      <footer className="fixed inset-x-0 bottom-0 z-20 flex flex-col gap-2 border-t-[3px] border-edge bg-surface px-4 pt-3 pb-[max(16px,env(safe-area-inset-bottom))] lg:sticky lg:px-8 lg:py-3.5">
        {error && (
          <p className="form-error text-sm" role="alert" data-testid="fanmade-error">
            {error}
          </p>
        )}
        <div className="flex items-center gap-2.5">
          <span className="flex min-w-0 flex-1 items-center gap-2 text-sm font-bold text-muted">
            <span
              className={`size-2.5 flex-none rounded-full ${dirty ? "bg-[#d97706]" : "bg-ok"}`}
              aria-hidden="true"
            />
            {busy ? "Salvataggio…" : dirty ? "Modifiche non salvate" : "Nessuna modifica"}
          </span>
          <button type="button" className="btn h-12 px-4" onClick={save} disabled={busy}>
            Salva fanmade
          </button>
        </div>
      </footer>
    </>
  );
}

function blank(): Ability {
  return { name: "", effect: "" };
}

/** "" → null; accetta la virgola decimale. */
function parseNumber(text: string, integer = false): number | null {
  const t = text.trim().replace(",", ".");
  if (!t) return null;
  const n = Number(t);
  if (!Number.isFinite(n)) return NaN;
  return integer ? Math.trunc(n) : n;
}

function Field({ id, label, children }: { id: string; label: string; children: React.ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <label htmlFor={id} className="label">
        {label}
      </label>
      {children}
    </div>
  );
}

function Stepper({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (n: number) => void;
}) {
  return (
    <div className="stp">
      <button
        type="button"
        aria-label={`Diminuisci ${label}`}
        disabled={value <= min}
        onClick={() => onChange(value - 1)}
      >
        −
      </button>
      <output aria-label={label}>{value}</output>
      <button
        type="button"
        aria-label={`Aumenta ${label}`}
        disabled={value >= max}
        onClick={() => onChange(value + 1)}
      >
        +
      </button>
    </div>
  );
}

function AbilityField({
  id,
  label,
  value,
  official,
  options,
  onChange,
}: {
  id: string;
  label: string;
  value: Ability;
  official: boolean;
  options: Suggestion[];
  onChange: (a: Ability) => void;
}) {
  const isNew = !official;
  return (
    <div
      className={`flex flex-col gap-2 rounded-[14px] border-2 border-edge p-3 ${isNew ? "bg-warn-bg" : "bg-surface2"}`}
    >
      <div className="flex items-center justify-between gap-2">
        <label htmlFor={id} className="label">
          {label}
        </label>
        {value.name &&
          (isNew ? (
            <span className="tag tag-new">Nuova</span>
          ) : (
            <span className="tag tag-info">Ufficiale</span>
          ))}
      </div>
      <SuggestInput
        id={id}
        value={value.name}
        options={options}
        placeholder="Cerca tra le ufficiali o scrivine una nuova"
        onChange={(name) => onChange({ ...value, name })}
      />
      {isNew && (
        <>
          <label htmlFor={`${id}-fx`} className="label">
            Effetto (obbligatorio)
          </label>
          <textarea
            id={`${id}-fx`}
            className="sheet-field min-h-24"
            rows={3}
            maxLength={2000}
            value={value.effect}
            onChange={(e) => onChange({ ...value, effect: e.target.value })}
          />
        </>
      )}
    </div>
  );
}

function MovesSection({
  moves,
  catalog,
  onChange,
}: {
  moves: FanmadeInput["moves"];
  catalog: { name: string; type: string }[];
  onChange: (moves: FanmadeInput["moves"]) => void;
}) {
  const [adding, setAdding] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const byKey = useMemo(
    () => new Map(catalog.map((m) => [normalize(m.name), m] as const)),
    [catalog],
  );
  const options = useMemo<Suggestion[]>(
    () => catalog.map((m) => ({ value: m.name, hint: <TypeBadge type={m.type} /> })),
    [catalog],
  );

  function add(rank: string, name: string) {
    const move = byKey.get(normalize(name));
    if (!move) {
      setError(name.trim() ? `Nessuna mossa ufficiale chiamata "${name.trim()}"` : null);
      return;
    }
    setError(null);
    setQuery("");
    if (moves.some((m) => m.rank === rank && m.name === move.name)) return;
    onChange([...moves, { rank: rank as never, name: move.name }]);
  }

  return (
    <section className="panel" aria-labelledby="fm-moves">
      <h2 id="fm-moves" className="h2">
        Mosse per rank
      </h2>
      <p className="m-0 text-sm text-muted">Solo mosse ufficiali.</p>
      {RANKS.map((rank) => {
        const list = moves.filter((m) => m.rank === rank);
        return (
          <div key={rank} className="flex flex-col gap-2">
            <h3 className="m-0 flex items-center gap-2 font-display text-base font-semibold">
              <RankIcon rank={rank} size={22} />
              {rank}
            </h3>
            <div className="flex flex-wrap gap-1.5">
              {list.map((m) => (
                <span key={m.name} className="mc">
                  <i
                    style={{
                      background: `var(--color-type-${(byKey.get(normalize(m.name))?.type ?? "normal").toLowerCase()})`,
                    }}
                  />
                  {m.name}
                  <button
                    type="button"
                    aria-label={`Togli ${m.name} da ${rank}`}
                    onClick={() => onChange(moves.filter((x) => x !== m))}
                  >
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                      strokeLinecap="round"
                      aria-hidden="true"
                    >
                      <path d="M6 6l12 12M18 6L6 18" />
                    </svg>
                  </button>
                </span>
              ))}
              {adding !== rank && (
                <button
                  type="button"
                  className="addc"
                  aria-label={`Aggiungi mossa a ${rank}`}
                  onClick={() => {
                    setAdding(rank);
                    setQuery("");
                    setError(null);
                  }}
                >
                  + mossa
                </button>
              )}
            </div>
            {adding === rank && (
              <div className="flex flex-col gap-1.5">
                <div className="flex gap-2">
                  <div className="min-w-0 flex-1">
                    <SuggestInput
                      id={`fm-move-${rank}`}
                      label={`Mossa da aggiungere a ${rank}`}
                      value={query}
                      options={options}
                      placeholder="Cerca mossa e premi Invio"
                      autoFocus
                      invalid={!!error}
                      onChange={(q) => {
                        setQuery(q);
                        setError(null);
                      }}
                      onPick={(name) => add(rank, name)}
                    />
                  </div>
                  <button
                    type="button"
                    className="btn btn-ghost h-11 text-sm"
                    onClick={() => setAdding(null)}
                  >
                    Fatto
                  </button>
                </div>
                {error && (
                  <p className="form-error text-sm" role="alert">
                    {error}
                  </p>
                )}
              </div>
            )}
          </div>
        );
      })}
    </section>
  );
}

function EvolutionRow({
  index,
  value,
  options,
  onChange,
  onRemove,
}: {
  index: number;
  value: Evo;
  options: Suggestion[];
  onChange: (e: Evo) => void;
  onRemove: () => void;
}) {
  const id = `fm-evo-${index}`;
  return (
    <div className="flex flex-col gap-2 rounded-[14px] border-2 border-edge bg-surface2 p-3">
      <Field id={id} label="Evolve in">
        <SuggestInput
          id={id}
          value={value.to}
          options={options}
          placeholder="Cerca specie o fanmade"
          onChange={(to) => onChange({ ...value, to })}
        />
      </Field>
      <div className="grid grid-cols-2 gap-2">
        <Field id={`${id}-kind`} label="Metodo">
          <select
            id={`${id}-kind`}
            className="sheet-field"
            value={value.kind}
            onChange={(e) => onChange({ ...value, kind: e.target.value as Evo["kind"] })}
          >
            {EVOLUTION_KINDS.map((k) => (
              <option key={k} value={k}>
                {KIND_LABEL[k] ?? k}
              </option>
            ))}
          </select>
        </Field>
        <Field id={`${id}-speed`} label="Velocità">
          <select
            id={`${id}-speed`}
            className="sheet-field"
            value={value.speed}
            onChange={(e) => onChange({ ...value, speed: e.target.value as Evo["speed"] })}
          >
            {EVOLUTION_SPEEDS.map((s) => (
              <option key={s} value={s}>
                {s ? SPEED_LABEL[s] : "—"}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <Field id={`${id}-item`} label="Strumento (facoltativo)">
        <input
          id={`${id}-item`}
          className="sheet-field"
          maxLength={60}
          placeholder="es. Thunder Stone"
          value={value.item}
          onChange={(e) => onChange({ ...value, item: e.target.value })}
        />
      </Field>
      <button type="button" className="btn btn-ghost h-10 self-start text-sm" onClick={onRemove}>
        Togli evoluzione
      </button>
    </div>
  );
}
