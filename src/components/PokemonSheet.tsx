"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import type { Pokemon } from "@/lib/access";
import {
  deletePokemon,
  evolvePokemon,
  movePokemonToTrainer,
  rankUp,
  setPokemonImage,
  setPokemonPlayState,
  updatePokemon,
} from "@/lib/actions/pokemon";
import type { PokemonUpdate } from "@/lib/actions/schemas";
import {
  POKEMON_ATTRIBUTES,
  POKEMON_SKILL_GROUPS,
  RANKS,
  attributePointsSpent,
  attributeLimitBonus,
  masterBonus,
  maxHp,
  maxWill,
  moveLabel,
  moveLabelText,
  moveLimit,
  nextRank,
  rankIndex,
  rulesFor,
  shownCurrent,
  skillPointsSpent,
  socialPointsSpent,
  type PokemonAttribute,
} from "@/lib/rules";
import { formatNumber } from "@/lib/labels";
import { computeWarnings } from "@/lib/warnings";
import { AbilityInfo } from "./AbilityInfo";
import { normalize } from "./Filters";
import { ImageTile } from "./ImageTile";
import { MoveRow, type MoveSummary } from "./MoveRow";
import { RankIcon } from "./RankIcon";
import { Sprite } from "./Sprite";
import { TypeBadge, TypeBadges, typeStyle } from "./TypeBadge";
import { usePlayState, useSheetDraft } from "./sheet/hooks";
import { PlayPanel } from "./sheet/PlayPanel";
import { SaveBar } from "./sheet/SaveBar";
import { AttributesCard, SheetTopBar, SkillsCard, SocialCard } from "./sheet/Sections";
import { DotScale } from "./sheet/DotScale";
import { WarningsBox } from "./sheet/WarningsBox";
import { useLazyJson } from "./useLazyJson";

export interface SheetSpecies {
  id: string;
  name: string;
  types: string[];
  baseHP: number;
  attributes: Record<PokemonAttribute, [number, number]>;
  abilities: string[];
  hiddenAbility: string | null;
  eventAbilities: string[];
  genderType: string;
  heightM: number;
  weightKg: number;
  image: string;
  moves: { rank: string; name: string }[];
  evolutions: { toId: string; name: string; method: string }[];
}

export interface PokemonSheetProps {
  pokemon: Pokemon;
  species: SheetSpecies;
  abilityEffects: Record<string, string>;
  natures: { name: string; confidence: number }[];
  /** Allenatori tra cui spostarlo; il rank serve per l'avviso "supera l'allenatore". */
  trainers: { id: string; name: string; rank: string }[];
  /** Mosse già note, con effetto e descrizione (le altre si scaricano per "Aggiungi mossa"). */
  moves: MoveSummary[];
  readOnly: boolean;
  back: { href: string; label: string; section: string };
  userId: string;
}

function toDraft(p: Pokemon): PokemonUpdate {
  return {
    nickname: p.nickname,
    gender: p.gender === "M" || p.gender === "F" ? p.gender : null,
    rank: p.rank as PokemonUpdate["rank"],
    nature: p.nature,
    ability: p.ability,
    heldItem: p.heldItem,
    attributes: p.attributes,
    social: p.social,
    skills: p.skills,
    moves: p.moves,
    happiness: p.happiness,
    loyalty: p.loyalty,
    notes: p.notes,
  };
}

/** Scheda Pokémon (§10.8). */
export function PokemonSheet(props: PokemonSheetProps) {
  const { pokemon: p, species, readOnly } = props;
  const router = useRouter();
  const sheet = useSheetDraft<PokemonUpdate>(toDraft(p), (d) => updatePokemon(p.id, d));
  const play = usePlayState(
    { currentHp: p.currentHp, currentWill: p.currentWill, statuses: p.statuses, locked: p.locked },
    (patch) => setPokemonPlayState(p.id, patch),
  );
  const [busy, startBusy] = useTransition();
  const [trainerId, setTrainerId] = useState(p.trainerId);
  const [image, setImage] = useState(p.image);

  const d = sheet.draft;
  const locked = play.values.locked;
  const editable = !readOnly && !locked;
  const rules = rulesFor(d.rank);
  const hpMax = maxHp("pokemon", d.attributes.vitality, species.baseHP, d.rank);
  const willMax = maxWill(d.attributes.insight, d.rank);
  const bonus = masterBonus(d.rank);
  const limitBonus = attributeLimitBonus(d.rank);
  const trainerRank = props.trainers.find((t) => t.id === trainerId)?.rank;
  const hp = shownCurrent(play.values.currentHp, hpMax);
  const will = shownCurrent(play.values.currentWill, willMax);
  const base = Object.fromEntries(POKEMON_ATTRIBUTES.map((a) => [a, species.attributes[a][0]]));

  const warnings = useMemo(
    () =>
      computeWarnings(
        {
          rank: d.rank,
          attributes: d.attributes,
          social: d.social,
          skills: d.skills,
          currentHp: play.values.currentHp,
          currentWill: play.values.currentWill,
          moves: d.moves,
          trainerRank,
        },
        "pokemon",
        species,
      ),
    [d, play.values.currentHp, play.values.currentWill, species, trainerRank],
  );

  const set = <K extends keyof PokemonUpdate>(key: K, value: PokemonUpdate[K]) =>
    sheet.setDraft((s) => ({ ...s, [key]: value }));

  /** Prima di rank up/evoluzione salva le modifiche in sospeso. */
  async function saveIfDirty() {
    return sheet.status === "saved" || (await sheet.saveNow());
  }

  const next = nextRank(d.rank);
  function doRankUp() {
    startBusy(async () => {
      if (!(await saveIfDirty())) return;
      const result = await rankUp(p.id);
      if (!result.ok) {
        sheet.setError(result.error);
        sheet.setStatus("error");
        return;
      }
      sheet.replace(toDraft(result.data.pokemon), result.data.summary);
    });
  }

  function doEvolve(toId: string, name: string) {
    if (!window.confirm(`Evolvere ${d.nickname || species.name} in ${name}?`)) return;
    startBusy(async () => {
      if (!(await saveIfDirty())) return;
      const result = await evolvePokemon(p.id, toId);
      if (!result.ok) {
        sheet.setError(result.error);
        sheet.setStatus("error");
        return;
      }
      const np = result.data.pokemon;
      sheet.replace(toDraft(np), result.data.summary);
      play.sync({
        currentHp: np.currentHp,
        currentWill: np.currentWill,
        statuses: np.statuses,
        locked: np.locked,
      });
      router.refresh();
    });
  }

  function changeTrainer(id: string) {
    const previous = trainerId;
    setTrainerId(id);
    startBusy(async () => {
      const result = await movePokemonToTrainer(p.id, id);
      if (!result.ok) {
        setTrainerId(previous);
        sheet.setError(result.error);
        sheet.setStatus("error");
      }
    });
  }

  function remove() {
    if (!window.confirm(`Eliminare ${d.nickname || species.name}? Non si può annullare.`)) return;
    startBusy(async () => {
      const result = await deletePokemon(p.id);
      if (result && !result.ok) sheet.setError(result.error);
    });
  }

  const displayName = d.nickname || species.name;
  const abilityOptions = [
    ...species.abilities,
    ...(species.hiddenAbility ? [species.hiddenAbility] : []),
    ...species.eventAbilities,
  ];
  if (d.ability && !abilityOptions.includes(d.ability)) abilityOptions.push(d.ability);
  const genderOptions: { value: "" | "M" | "F"; label: string }[] =
    species.genderType === "N"
      ? [{ value: "", label: "— senza genere" }]
      : species.genderType === "M"
        ? [{ value: "M", label: "♂ maschio" }]
        : species.genderType === "F"
          ? [{ value: "F", label: "♀ femmina" }]
          : [
              { value: "M", label: "♂ maschio" },
              { value: "F", label: "♀ femmina" },
            ];
  if (d.gender && !genderOptions.some((g) => g.value === d.gender)) {
    genderOptions.push({ value: d.gender, label: d.gender === "M" ? "♂ maschio" : "♀ femmina" });
  }
  if (!d.gender && !genderOptions.some((g) => g.value === ""))
    genderOptions.unshift({ value: "", label: "—" });

  return (
    <>
      <SheetTopBar
        eyebrow="Scheda Pokémon"
        title={`${displayName} · ${species.name}`}
        back={props.back}
        locked={locked}
        readOnly={readOnly}
        onToggleLock={() => play.update({ locked: !locked })}
        jumps={[
          { href: "#in-gioco", label: "In gioco" },
          { href: "#attributi", label: "Attributi" },
          { href: "#skill", label: "Skill" },
          { href: "#mosse", label: "Mosse" },
          { href: "#note", label: "Note" },
        ]}
      />
      <main className="flex flex-col gap-4 p-4 pb-28 lg:gap-5 lg:px-8 lg:pt-4 lg:pb-8">
        {/* IDENTITÀ */}
        <section className="panel order-3 lg:order-1" aria-label="Pokémon">
          <fieldset
            disabled={!editable}
            className="m-0 flex min-w-0 flex-col gap-3 border-0 p-0 lg:flex-row lg:flex-wrap lg:items-start lg:gap-5"
          >
            <div className="flex items-start gap-3.5 lg:flex-[1_1_300px]">
              <ImageTile
                kind="pokemon"
                userId={props.userId}
                label="Immagine"
                hasCustom={!!image}
                aspect={1}
                editable={editable}
                className="tint size-[104px] rounded-[20px] border-2 border-edge"
                style={typeStyle(species.types[0])}
                save={async (url) => {
                  const r = await setPokemonImage(p.id, url);
                  if (r.ok) setImage(url);
                  return r.ok ? null : r.error;
                }}
              >
                <Sprite
                  key={image ?? species.image}
                  image={image ?? species.image}
                  name={species.name}
                  size={96}
                />
              </ImageTile>
              <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                <label htmlFor="pk-nick" className="label">
                  Soprannome
                </label>
                <input
                  id="pk-nick"
                  className="nick"
                  value={d.nickname}
                  placeholder={species.name}
                  maxLength={60}
                  onChange={(e) => set("nickname", e.target.value)}
                />
                <Link href={`/dex/${species.id}`} className="text-[15px] font-bold">
                  {species.name}
                </Link>
                <TypeBadges types={species.types} />
                <span className="text-[13px] font-bold text-muted">
                  {formatNumber(species.heightM, "m")} · {formatNumber(species.weightKg, "kg")}
                </span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2.5 lg:flex-[2_1_520px] lg:grid-cols-3">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="pk-gender" className="label">
                  Genere
                </label>
                <select
                  id="pk-gender"
                  className="sheet-field"
                  value={d.gender ?? ""}
                  onChange={(e) =>
                    set("gender", (e.target.value || null) as PokemonUpdate["gender"])
                  }
                >
                  {genderOptions.map((g) => (
                    <option key={g.value} value={g.value}>
                      {g.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="pk-trainer" className="label">
                  Allenatore
                </label>
                <select
                  id="pk-trainer"
                  className="sheet-field"
                  value={trainerId}
                  disabled={readOnly || props.trainers.length < 2}
                  onChange={(e) => changeTrainer(e.target.value)}
                >
                  {props.trainers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="pk-rank" className="label">
                  Rank
                </label>
                <div className="flex items-center gap-2">
                  <RankIcon rank={d.rank} size={30} />
                  <select
                    id="pk-rank"
                    className="sheet-field min-w-0 flex-1 px-2"
                    value={d.rank}
                    onChange={(e) => set("rank", e.target.value as PokemonUpdate["rank"])}
                  >
                    {RANKS.map((r) => (
                      <option key={r}>{r}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="pk-nature" className="label">
                  Natura
                </label>
                <select
                  id="pk-nature"
                  className="sheet-field"
                  value={d.nature}
                  onChange={(e) => set("nature", e.target.value)}
                >
                  <option value="">—</option>
                  {props.natures.map((n) => (
                    <option key={n.name} value={n.name}>
                      {n.name} ({n.confidence})
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="pk-ability" className="label">
                  Abilità
                </label>
                <select
                  id="pk-ability"
                  className="sheet-field"
                  value={d.ability}
                  onChange={(e) => set("ability", e.target.value)}
                >
                  {abilityOptions.map((a) => (
                    <option key={a} value={a}>
                      {a}
                      {a === species.hiddenAbility ? " (nascosta)" : ""}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="pk-item" className="label">
                  Strumento tenuto
                </label>
                <input
                  id="pk-item"
                  className="sheet-field"
                  value={d.heldItem}
                  placeholder="Nessuno"
                  maxLength={80}
                  onChange={(e) => set("heldItem", e.target.value)}
                />
              </div>
            </div>
          </fieldset>
          {d.ability && (
            <AbilityInfo
              name={d.ability}
              effect={props.abilityEffects[d.ability] ?? null}
              tag={d.ability === species.hiddenAbility ? "Nascosta" : undefined}
            />
          )}
        </section>

        <WarningsBox
          className="order-2 lg:order-2"
          warnings={readOnly ? [] : warnings}
          changes={sheet.changes}
        />

        <div className="contents lg:order-3 lg:grid lg:grid-cols-[repeat(auto-fit,minmax(330px,1fr))] lg:items-start lg:gap-5">
          {/* COLONNA 1 */}
          <div className="contents lg:flex lg:flex-col lg:gap-5">
            <div className="order-1 lg:order-none">
              <PlayPanel
                hp={hp}
                hpMax={hpMax}
                will={will}
                willMax={willMax}
                statuses={play.values.statuses}
                locked={locked}
                readOnly={readOnly}
                onHp={(v) => play.update({ currentHp: v })}
                onWill={(v) => play.update({ currentWill: v })}
                onStatuses={(v) => play.update({ statuses: v })}
              >
                <div className="grid grid-cols-3 gap-2">
                  <div className="mini-stat">
                    <span className="label-sm">Difesa</span>
                    <span className="font-display text-2xl font-bold">
                      {d.attributes.vitality + bonus}
                    </span>
                  </div>
                  <div className="mini-stat">
                    <span className="label-sm">Dif. Speciale</span>
                    <span className="font-display text-2xl font-bold">
                      {d.attributes.insight + bonus}
                    </span>
                  </div>
                  <div className="mini-stat">
                    <span className="label-sm">Iniziativa</span>
                    <span className="font-display text-xl font-bold whitespace-nowrap">
                      1d6 + {d.attributes.dexterity + (d.skills.alert ?? 0) + bonus}
                    </span>
                  </div>
                </div>
                {bonus > 0 && (
                  <p className="m-0 text-[13px] text-muted">
                    Bonus {d.rank}: +3 a HP, Will, Iniziativa e Difese (già inclusi); +2 dadi ai
                    tiri che usano una skill.
                  </p>
                )}
              </PlayPanel>
            </div>
            {!readOnly && (next || species.evolutions.length > 0) && (
              <section className="panel order-7 lg:order-none" aria-label="Crescita">
                <h2 className="h2">Crescita</h2>
                {next && (
                  <button
                    type="button"
                    className="btn btn-blue w-full"
                    disabled={!editable || busy}
                    onClick={doRankUp}
                  >
                    Sali di rank → {next}
                  </button>
                )}
                {species.evolutions.map((e) => (
                  <div key={e.toId} className="flex flex-col gap-1">
                    <button
                      type="button"
                      className="btn w-full"
                      disabled={!editable || busy}
                      onClick={() => doEvolve(e.toId, e.name)}
                    >
                      Evolvi in {e.name}
                    </button>
                    <span className="text-center text-[13px] text-muted">{e.method}</span>
                  </div>
                ))}
              </section>
            )}
            <section className="panel order-9 gap-1 lg:order-none" aria-label="Legame">
              <h2 className="h2 mb-1">Legame</h2>
              {(
                [
                  ["happiness", "Felicità"],
                  ["loyalty", "Lealtà"],
                ] as const
              ).map(([key, label]) => (
                <div key={key} className="flex min-h-10 items-center justify-between gap-2">
                  <span className="w-[90px] text-[15px] font-bold">{label}</span>
                  <DotScale
                    label={label}
                    value={d[key]}
                    max={5}
                    slots={5}
                    width={32}
                    disabled={!editable}
                    onChange={(v) => set(key, v)}
                  />
                  <span className="cnt w-10 text-right">{d[key]} / 5</span>
                </div>
              ))}
            </section>
          </div>

          {/* COLONNA 2 */}
          <div className="contents lg:flex lg:flex-col lg:gap-5">
            <div className="order-4 lg:order-none">
              <AttributesCard
                rows={POKEMON_ATTRIBUTES.map((key) => ({
                  key,
                  value: d.attributes[key],
                  base: species.attributes[key][0],
                  max: species.attributes[key][1] + limitBonus,
                }))}
                slots={10}
                left={rules.attributePoints - attributePointsSpent(d.attributes, base)}
                disabled={!editable}
                legend
                onChange={(key, v) =>
                  sheet.setDraft((s) => ({ ...s, attributes: { ...s.attributes, [key]: v } }))
                }
              />
            </div>
            <div className="order-5 lg:order-none">
              <SocialCard
                values={d.social}
                left={rules.socialPoints - socialPointsSpent(d.social)}
                max={5 + limitBonus}
                disabled={!editable}
                onChange={(key, v) =>
                  sheet.setDraft((s) => ({ ...s, social: { ...s.social, [key]: v } }))
                }
              />
            </div>
            <div className="order-6 lg:order-none">
              <SkillsCard
                groups={POKEMON_SKILL_GROUPS}
                values={d.skills}
                cap={rules.skillLimit}
                rank={d.rank}
                left={rules.skillPoints - skillPointsSpent(d.skills)}
                disabled={!editable}
                onChange={(key, v) =>
                  sheet.setDraft((s) => ({ ...s, skills: { ...s.skills, [key]: v } }))
                }
              />
            </div>
          </div>

          {/* COLONNA 3 */}
          <div className="contents lg:flex lg:flex-col lg:gap-5">
            <MovesCard
              className="order-8 lg:order-none"
              known={d.moves}
              rank={d.rank}
              limit={moveLimit(d.attributes.insight)}
              learnset={species.moves}
              knownDetails={props.moves}
              editable={editable}
              onChange={(moves) => set("moves", moves)}
            />
            <section id="note" className="panel order-10 scroll-mt-20 gap-2 lg:order-none">
              <label htmlFor="pk-notes" className="h2">
                Note
              </label>
              <textarea
                id="pk-notes"
                className="sheet-field"
                value={d.notes}
                disabled={!editable}
                onChange={(e) => set("notes", e.target.value)}
              />
            </section>
            {!readOnly && (
              <section className="order-11 lg:order-none">
                <button type="button" className="btn btn-danger" onClick={remove} disabled={busy}>
                  Elimina Pokémon
                </button>
              </section>
            )}
          </div>
        </div>
      </main>
      <SaveBar
        hidden={readOnly}
        status={play.error ? "error" : sheet.status}
        error={play.error ?? sheet.error}
        warningCount={warnings.length}
        onSave={() => void sheet.saveNow()}
      />
    </>
  );
}

function MovesCard({
  className,
  known,
  rank,
  limit,
  learnset,
  knownDetails,
  editable,
  onChange,
}: {
  className: string;
  known: string[];
  rank: string;
  limit: number;
  learnset: { rank: string; name: string }[];
  knownDetails: MoveSummary[];
  editable: boolean;
  onChange: (moves: string[]) => void;
}) {
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const all = useLazyJson<MoveSummary[]>("/api/mosse");
  // Elenco completo (scaricato al primo focus) con i dettagli delle mosse già note.
  const catalog = useMemo(() => {
    const details = new Map(knownDetails.map((m) => [m.id, m]));
    return all.data ? all.data.map((m) => details.get(m.id) ?? m) : knownDetails;
  }, [all.data, knownDetails]);
  const byName = useMemo(() => new Map(catalog.map((m) => [m.name.toLowerCase(), m])), [catalog]);
  const learnRank = useMemo(() => {
    const map = new Map<string, string>();
    for (const m of learnset) {
      const key = m.name.toLowerCase();
      const prev = map.get(key);
      if (!prev || rankIndex(m.rank) < rankIndex(prev)) map.set(key, m.rank);
    }
    return map;
  }, [learnset]);

  const suggestions = useMemo(() => {
    const q = normalize(query);
    const knownSet = new Set(known.map((k) => k.toLowerCase()));
    const pool = catalog.filter((m) => !knownSet.has(m.name.toLowerCase()));
    const matching = q
      ? pool.filter((m) => normalize(m.name).includes(q))
      : pool.filter((m) => learnRank.has(m.name.toLowerCase()));
    // Il learnset in cima, ordinato per rank; poi le altre in ordine alfabetico.
    return matching
      .sort((a, b) => {
        const ra = learnRank.get(a.name.toLowerCase());
        const rb = learnRank.get(b.name.toLowerCase());
        if (ra && rb) return rankIndex(ra) - rankIndex(rb) || a.name.localeCompare(b.name);
        if (ra) return -1;
        if (rb) return 1;
        return a.name.localeCompare(b.name);
      })
      .slice(0, 10);
  }, [query, catalog, known, learnRank]);

  function add(name: string) {
    onChange([...known, name]);
    setQuery("");
  }

  const [error, setError] = useState<string | null>(null);
  async function submit() {
    if (!all.data && !(await all.load())) {
      return setError("Elenco delle mosse non disponibile: controlla la connessione");
    }
    const exact = byName.get(query.trim().toLowerCase());
    const pick = exact ?? suggestions[0];
    if (!pick) return setError(`Nessuna mossa chiamata "${query.trim()}"`);
    setError(null);
    add(pick.name);
  }

  return (
    <section id="mosse" className={`panel scroll-mt-20 ${className}`} aria-label="Mosse">
      <div className="flex items-center justify-between">
        <h2 className="h2">Mosse</h2>
        <span className="cnt" data-warn={known.length > limit}>
          {known.length} / {limit}
        </span>
      </div>
      {known.length === 0 && (
        <p className="m-0 text-muted">
          {editable
            ? "Nessuna mossa: aggiungile qui sotto, quelle del learnset compaiono per prime."
            : "Nessuna mossa."}
        </p>
      )}
      {known.map((name, i) => {
        const move = byName.get(name.toLowerCase());
        const label = moveLabel(name, rank, learnset);
        const tag = (
          <span className={`tag self-start ${label.kind === "learnset" ? "tag-ok" : "tag-warn"}`}>
            {moveLabelText(label)}
          </span>
        );
        const remove = editable ? (
          <button
            type="button"
            className="btn btn-ghost h-11 self-start text-sm"
            onClick={() => onChange(known.filter((_, j) => j !== i))}
          >
            Togli
          </button>
        ) : null;
        return move ? (
          <MoveRow key={`${name}-${i}`} move={move} extra={tag} footer={remove} />
        ) : (
          <div key={`${name}-${i}`} className="xrow flex flex-col gap-2 bg-surface2 p-3">
            <span className="font-extrabold">{name}</span>
            {tag}
            {remove}
          </div>
        );
      })}
      {editable && (
        <div className="relative overflow-hidden rounded-[14px] border border-line bg-surface2">
          <label htmlFor="add-move" className="flex h-[50px] items-center gap-2.5 px-3">
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
            <span className="sr-only">Aggiungi mossa</span>
            <input
              id="add-move"
              type="search"
              value={query}
              autoComplete="off"
              enterKeyHint="done"
              placeholder="Aggiungi mossa · cerca tra tutte"
              className="h-12 min-w-0 flex-1 border-0 bg-transparent text-base outline-none"
              onFocus={() => {
                setFocused(true);
                void all.load();
              }}
              onBlur={() => setTimeout(() => setFocused(false), 150)}
              onChange={(e) => {
                setQuery(e.target.value);
                setError(null);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void submit();
                }
              }}
            />
          </label>
          {(focused || query) &&
            suggestions.map((m) => {
              const r = learnRank.get(m.name.toLowerCase());
              return (
                <button
                  key={m.id}
                  type="button"
                  className="flex min-h-12 w-full cursor-pointer items-center gap-2.5 border-0 border-t border-line bg-transparent px-3 py-1.5 text-left text-[15px] hover:bg-surface"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => add(m.name)}
                >
                  <span className="flex-1 font-bold">{m.name}</span>
                  <TypeBadge type={m.type} />
                  {r ? (
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-muted">
                      <RankIcon rank={r} size={18} />
                      {r}
                    </span>
                  ) : (
                    <span className="text-xs font-bold text-muted">fuori learnset</span>
                  )}
                </button>
              );
            })}
          {error && (
            <p className="form-error m-2" role="alert">
              {error}
            </p>
          )}
        </div>
      )}
    </section>
  );
}
