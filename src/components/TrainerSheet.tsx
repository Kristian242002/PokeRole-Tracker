"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import {
  deleteTrainer,
  setTrainerImage,
  setTrainerPlayState,
  updateTrainer,
} from "@/lib/actions/trainers";
import type { TrainerUpdate } from "@/lib/actions/schemas";
import {
  RANKS,
  TRAINER_ATTRIBUTES,
  TRAINER_SKILL_GROUPS,
  attributePointsSpent,
  attributeLimitBonus,
  maxHp,
  maxWill,
  rulesFor,
  shownCurrent,
  skillPointsSpent,
  socialPointsSpent,
} from "@/lib/rules";
import { computeWarnings } from "@/lib/warnings";
import { AddPokemonPicker } from "./AddPokemonPicker";
import { ImageTile } from "./ImageTile";
import { RankIcon } from "./RankIcon";
import { Sprite } from "./Sprite";
import { TrainerPortrait } from "./TrainerPortrait";
import { typeStyle } from "./TypeBadge";
import { CampaignField, type TrainerCampaign } from "./sheet/CampaignField";
import { usePlayState, useSheetDraft } from "./sheet/hooks";
import { PlayPanel } from "./sheet/PlayPanel";
import { SaveBar } from "./sheet/SaveBar";
import { AttributesCard, SheetTopBar, SkillsCard, SocialCard } from "./sheet/Sections";
import { WarningsBox } from "./sheet/WarningsBox";

export interface TrainerSheetData extends TrainerUpdate {
  id: string;
  image: string | null;
  currentHp: number | null;
  currentWill: number | null;
  statuses: string[];
  locked: boolean;
}

export interface SheetBack {
  href: string;
  label: string;
  section: string;
}

export interface TeamMember {
  id: string;
  name: string;
  species: string;
  image: string;
  type: string;
  rank: string;
  hp: number;
  hpMax: number;
}

/** Scheda allenatore (§10.6): in alto la parte in gioco, sotto la scheda. */
export function TrainerSheet({
  trainer,
  team,
  readOnly,
  campaign,
  back,
  userId,
}: {
  trainer: TrainerSheetData;
  team: TeamMember[];
  readOnly: boolean;
  campaign: TrainerCampaign;
  back: SheetBack;
  userId: string;
}) {
  const [image, setImage] = useState(trainer.image);
  const id = trainer.id;
  const sheet = useSheetDraft<TrainerUpdate>(
    {
      name: trainer.name,
      age: trainer.age,
      rank: trainer.rank,
      money: trainer.money,
      attributes: trainer.attributes,
      social: trainer.social,
      skills: trainer.skills,
      backpack: trainer.backpack,
      notes: trainer.notes,
    },
    (d) => updateTrainer(id, d),
  );
  const play = usePlayState(
    {
      currentHp: trainer.currentHp,
      currentWill: trainer.currentWill,
      statuses: trainer.statuses,
      locked: trainer.locked,
    },
    (patch) => setTrainerPlayState(id, patch),
  );
  const [deleting, startDelete] = useTransition();

  const d = sheet.draft;
  const locked = play.values.locked;
  const editable = !readOnly && !locked;
  const rules = rulesFor(d.rank);
  const hpMax = maxHp("trainer", d.attributes.vitality, 0, d.rank);
  const willMax = maxWill(d.attributes.insight, d.rank);
  const limit = 5 + attributeLimitBonus(d.rank);
  const hp = shownCurrent(play.values.currentHp, hpMax);
  const will = shownCurrent(play.values.currentWill, willMax);

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
        },
        "trainer",
      ),
    [d, play.values.currentHp, play.values.currentWill],
  );

  const set = <K extends keyof TrainerUpdate>(key: K, value: TrainerUpdate[K]) =>
    sheet.setDraft((s) => ({ ...s, [key]: value }));

  const attrLeft = rules.attributePoints - attributePointsSpent(d.attributes, 1);
  const skillLeft = rules.skillPoints - skillPointsSpent(d.skills);

  function remove() {
    if (!window.confirm(`Eliminare ${d.name} e tutti i suoi Pokémon? Non si può annullare.`))
      return;
    startDelete(async () => {
      const result = await deleteTrainer(id);
      if (result && !result.ok) sheet.setError(result.error);
    });
  }

  return (
    <>
      <SheetTopBar
        eyebrow="Scheda allenatore"
        title={d.name || "Senza nome"}
        back={back}
        locked={locked}
        readOnly={readOnly}
        onToggleLock={() => play.update({ locked: !locked })}
        jumps={[
          { href: "#in-gioco", label: "In gioco" },
          { href: "#attributi", label: "Attributi" },
          { href: "#skill", label: "Skill" },
          { href: "#zaino", label: "Zaino" },
          { href: "#pokemon", label: "Pokémon" },
        ]}
      />
      <main className="flex flex-col gap-4 p-4 pb-28 lg:gap-5 lg:px-8 lg:pt-4 lg:pb-8">
        <div className="order-3 lg:order-1">
          <section className="panel" aria-label="Allenatore">
            <fieldset
              disabled={!editable}
              className="m-0 flex min-w-0 flex-col gap-3 border-0 p-0 lg:flex-row lg:flex-wrap lg:items-end lg:gap-5"
            >
              <div className="flex items-start gap-3.5 lg:flex-[1_1_380px]">
                <ImageTile
                  kind="trainer"
                  userId={userId}
                  label="Ritratto"
                  hasCustom={!!image}
                  aspect={0.8}
                  editable={editable}
                  className="h-[120px] w-24 rounded-2xl border-2 border-edge bg-surface2"
                  save={async (url) => {
                    const r = await setTrainerImage(id, url);
                    if (r.ok) setImage(url);
                    return r.ok ? null : r.error;
                  }}
                >
                  <TrainerPortrait
                    image={image}
                    name={d.name}
                    className="size-full rounded-none! border-0!"
                  />
                </ImageTile>
                <div className="flex min-w-0 flex-1 flex-col gap-2">
                  <label htmlFor="t-name" className="label">
                    Nome
                  </label>
                  <input
                    id="t-name"
                    className="nick"
                    value={d.name}
                    maxLength={60}
                    onChange={(e) => set("name", e.target.value)}
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex flex-col gap-1">
                      <label htmlFor="t-age" className="label-sm">
                        Età
                      </label>
                      <input
                        id="t-age"
                        className="sheet-field"
                        inputMode="numeric"
                        value={d.age ?? ""}
                        onChange={(e) => {
                          const n = parseInt(e.target.value, 10);
                          set("age", Number.isNaN(n) ? null : n);
                        }}
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label htmlFor="t-money" className="label-sm">
                        Soldi
                      </label>
                      <input
                        id="t-money"
                        className="sheet-field"
                        inputMode="numeric"
                        value={d.money}
                        onChange={(e) => set("money", parseInt(e.target.value, 10) || 0)}
                      />
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex flex-col gap-1.5 lg:flex-[0_1_280px]">
                <label htmlFor="t-rank" className="label">
                  Rank
                </label>
                <div className="flex items-center gap-2.5">
                  <RankIcon rank={d.rank} size={30} />
                  <select
                    id="t-rank"
                    className="sheet-field flex-1"
                    value={d.rank}
                    onChange={(e) => set("rank", e.target.value as TrainerUpdate["rank"])}
                  >
                    {RANKS.map((r) => (
                      <option key={r}>{r}</option>
                    ))}
                  </select>
                </div>
              </div>
            </fieldset>
          </section>
        </div>

        <WarningsBox
          className="order-2 lg:order-2"
          warnings={readOnly ? [] : warnings}
          changes={sheet.changes}
        />

        <div className="contents lg:order-3 lg:grid lg:grid-cols-[repeat(auto-fit,minmax(330px,1fr))] lg:items-start lg:gap-5">
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
              />
            </div>
            <section
              id="pokemon"
              className="panel order-9 scroll-mt-20 lg:order-none"
              aria-label="I suoi Pokémon"
            >
              <div className="flex items-center justify-between">
                <h2 className="h2">I suoi Pokémon</h2>
                <span className="cnt">{team.length}</span>
              </div>
              {team.length === 0 && (
                <p className="m-0 text-muted">
                  {readOnly
                    ? "Nessun Pokémon."
                    : "Nessun Pokémon: cercane uno qui sotto in “Aggiungi Pokémon”."}
                </p>
              )}
              <ul className="grid grid-cols-2 gap-2.5">
                {team.map((p) => (
                  <li key={p.id}>
                    <Link
                      href={`/pokemon/${p.id}`}
                      className="card flex h-full flex-col gap-2 rounded-[14px] p-3 shadow-[0_3px_0_var(--edge)]"
                    >
                      <span className="flex items-center gap-2.5">
                        <span
                          className="tint grid size-11 flex-none place-items-center rounded-xl"
                          style={typeStyle(p.type)}
                        >
                          <Sprite image={p.image} name={p.species} size={40} />
                        </span>
                        <span className="flex min-w-0 flex-col">
                          <span className="truncate text-base font-bold">{p.name}</span>
                          <span className="truncate text-[13px] text-muted">{p.species}</span>
                        </span>
                      </span>
                      <span className="flex items-center justify-between text-[13px] font-bold">
                        <span>
                          HP {p.hp}/{p.hpMax}
                        </span>
                        <span className="text-muted">{p.rank}</span>
                      </span>
                      <span
                        className="h-1.5 overflow-hidden rounded-sm bg-dot-empty"
                        aria-hidden="true"
                      >
                        <span
                          className="block h-1.5"
                          style={{
                            width: `${p.hpMax ? Math.round((p.hp / p.hpMax) * 100) : 0}%`,
                            background:
                              p.hp / p.hpMax <= 0.25
                                ? "#e0412f"
                                : p.hp / p.hpMax <= 0.5
                                  ? "#f2b705"
                                  : "#2fb566",
                          }}
                        />
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
              {!readOnly && <AddPokemonPicker trainerId={id} />}
            </section>
          </div>

          <div className="contents lg:flex lg:flex-col lg:gap-5">
            <div className="order-4 lg:order-none">
              <AttributesCard
                rows={TRAINER_ATTRIBUTES.map((key) => ({
                  key,
                  value: d.attributes[key],
                  base: 1,
                  max: limit,
                }))}
                slots={limit}
                left={attrLeft}
                disabled={!editable}
                legend={false}
                onChange={(key, v) =>
                  sheet.setDraft((s) => ({ ...s, attributes: { ...s.attributes, [key]: v } }))
                }
              />
            </div>
            <div className="order-5 lg:order-none">
              <SocialCard
                values={d.social}
                left={rules.socialPoints - socialPointsSpent(d.social)}
                max={limit}
                disabled={!editable}
                onChange={(key, v) =>
                  sheet.setDraft((s) => ({ ...s, social: { ...s.social, [key]: v } }))
                }
              />
            </div>
          </div>

          <div className="contents lg:flex lg:flex-col lg:gap-5">
            <div className="order-6 lg:order-none">
              <SkillsCard
                groups={TRAINER_SKILL_GROUPS}
                values={d.skills}
                cap={rules.skillLimit}
                rank={d.rank}
                left={skillLeft}
                disabled={!editable}
                onChange={(key, v) =>
                  sheet.setDraft((s) => ({ ...s, skills: { ...s.skills, [key]: v } }))
                }
              />
            </div>
            <section id="zaino" className="panel order-7 scroll-mt-20 gap-2 lg:order-none">
              <label htmlFor="t-backpack" className="h2">
                Zaino
              </label>
              <textarea
                id="t-backpack"
                className="sheet-field"
                value={d.backpack}
                disabled={!editable}
                placeholder="Strumenti, bacche, Poké Ball…"
                onChange={(e) => set("backpack", e.target.value)}
              />
            </section>
            <div className="order-8 lg:order-none">
              <CampaignField trainerId={id} campaign={campaign} readOnly={readOnly} />
            </div>
            <section className="panel order-8 gap-2 lg:order-none">
              <label htmlFor="t-notes" className="h2">
                Note
              </label>
              <textarea
                id="t-notes"
                className="sheet-field"
                value={d.notes}
                disabled={!editable}
                onChange={(e) => set("notes", e.target.value)}
              />
            </section>
            {!readOnly && (
              <section className="order-10 flex flex-col gap-2 lg:order-none">
                <button
                  type="button"
                  className="btn btn-danger self-start"
                  onClick={remove}
                  disabled={deleting}
                >
                  Elimina allenatore
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
