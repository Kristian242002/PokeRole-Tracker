/**
 * Pipeline dei dati di gioco (§5).
 * Uso: npm run data:build -- <percorso>/Pokerole-Data/v3.0
 * Legge i JSON della community e scrive file compatti in data/.
 */
import { readdirSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

type Raw = Record<string, unknown>;

const str = (v: unknown): string => (typeof v === "string" ? v : "");
const num = (v: unknown): number => (typeof v === "number" ? v : Number(v) || 0);
const nonEmpty = (...values: unknown[]): string[] => values.map(str).filter((s) => s.trim() !== "");

export type Attribute = "strength" | "dexterity" | "vitality" | "special" | "insight";

export interface Evolution {
  from?: string;
  fromId?: string;
  to?: string;
  toId?: string;
  kind: string;
  speed?: string;
  item?: string;
}

export interface Species {
  id: string;
  number: number;
  name: string;
  types: string[];
  baseHP: number;
  attributes: Record<Attribute, [number, number]>;
  abilities: string[];
  hiddenAbility: string | null;
  eventAbilities: string;
  recommendedRank: string;
  legendary: boolean;
  goodStarter: boolean;
  genderType: string;
  heightM: number;
  weightKg: number;
  category: string;
  description: string;
  image: string;
  evolutions: Evolution[];
  moves: { rank: string; name: string }[];
}

export function parseSpecies(j: Raw): Species {
  const pair = (k: string): [number, number] => [num(j[k]), num(j["Max" + k])];
  const height = (j.Height ?? {}) as Raw;
  const weight = (j.Weight ?? {}) as Raw;
  return {
    id: str(j._id),
    number: num(j.Number),
    name: str(j.Name),
    types: nonEmpty(j.Type1, j.Type2),
    baseHP: num(j.BaseHP),
    attributes: {
      strength: pair("Strength"),
      dexterity: pair("Dexterity"),
      vitality: pair("Vitality"),
      special: pair("Special"),
      insight: pair("Insight"),
    },
    abilities: nonEmpty(j.Ability1, j.Ability2),
    hiddenAbility: str(j.HiddenAbility).trim() || null,
    eventAbilities: str(j.EventAbilities),
    recommendedRank: str(j.RecommendedRank),
    legendary: j.Legendary === true,
    goodStarter: j.GoodStarter === true,
    genderType: str(j.GenderType),
    heightM: num(height.Meters),
    weightKg: num(weight.Kilograms),
    category: str(j.DexCategory),
    description: str(j.DexDescription),
    image: str(j.Image),
    evolutions: ((j.Evolutions as Raw[]) ?? []).map((e) => {
      const ev: Evolution = { kind: str(e.Kind) };
      if (str(e.From)) ev.from = str(e.From);
      if (str(e.To)) ev.to = str(e.To);
      if (str(e.Speed)) ev.speed = str(e.Speed);
      if (str(e.Item)) ev.item = str(e.Item);
      return ev;
    }),
    moves: ((j.Moves as Raw[]) ?? []).map((m) => ({ rank: str(m.Learned), name: str(m.Name) })),
  };
}

const nameKey = (name: string) =>
  name
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();

/** Aggiunge gli id delle specie collegate alle evoluzioni (il sorgente usa i nomi). */
export function resolveEvolutionIds(species: Species[]): void {
  const byName = new Map(species.map((s) => [nameKey(s.name), s.id]));
  for (const s of species) {
    for (const e of s.evolutions) {
      if (e.from) {
        const id = byName.get(nameKey(e.from));
        if (id) e.fromId = id;
      }
      if (e.to) {
        const id = byName.get(nameKey(e.to));
        if (id) e.toId = id;
      }
    }
  }
}

export interface Move {
  id: string;
  name: string;
  type: string;
  category: string;
  power: number;
  damage: string[];
  accuracy: string[];
  target: string;
  effect: string;
  description: string;
  addedEffects: unknown;
}

export function parseMove(j: Raw): Move {
  return {
    id: str(j._id),
    name: str(j.Name),
    type: str(j.Type),
    category: str(j.Category),
    power: num(j.Power),
    damage: nonEmpty(j.Damage1, j.Damage2),
    accuracy: nonEmpty(j.Accuracy1, j.Accuracy2),
    target: str(j.Target),
    effect: str(j.Effect),
    description: str(j.Description),
    addedEffects: j.AddedEffects ?? {},
  };
}

export interface Ability {
  id: string;
  name: string;
  effect: string;
  description: string;
}

export function parseAbility(j: Raw): Ability {
  return {
    id: str(j._id),
    name: str(j.Name),
    effect: str(j.Effect),
    description: str(j.Description),
  };
}

export interface Item {
  id: string;
  name: string;
  pocket: string;
  category: string;
  description: string;
  oneUse: boolean;
  price: number | "Not for Sale";
  image: string;
  forPokemon?: string;
  forTypes?: string;
  boost?: string;
  value?: unknown;
  cures?: unknown;
  healthRestored?: unknown;
  source: string;
}

export function parseItem(j: Raw): Item {
  const rawPrice = j.TrainerPrice;
  const price =
    typeof rawPrice === "number"
      ? rawPrice
      : /^\d+$/.test(str(rawPrice).trim())
        ? Number(str(rawPrice).trim())
        : ("Not for Sale" as const);
  const item: Item = {
    id: str(j._id),
    name: str(j.Name),
    pocket: str(j.Pocket),
    category: str(j.Category),
    description: str(j.Description),
    oneUse: j.OneUse === true,
    price,
    image: str(j.Image),
    source: str(j.Source),
  };
  const optional = (v: unknown) => v !== undefined && v !== null && v !== "";
  if (optional(j.ForPokemon)) item.forPokemon = String(j.ForPokemon);
  if (optional(j.ForTypes)) item.forTypes = String(j.ForTypes);
  if (optional(j.Boost)) item.boost = String(j.Boost);
  if (optional(j.Value)) item.value = j.Value;
  if (optional(j.Cures)) item.cures = j.Cures;
  if (optional(j.HealthRestored)) item.healthRestored = j.HealthRestored;
  return item;
}

export interface Nature {
  id: string;
  name: string;
  confidence: number;
  keywords: string;
  description: string;
}

export function parseNature(j: Raw): Nature {
  return {
    id: str(j._id),
    name: str(j.Name),
    confidence: num(j.Confidence),
    keywords: str(j.Keywords),
    description: str(j.Description),
  };
}

export type MoveLearners = Record<string, { speciesId: string; rank: string }[]>;

export function buildMoveLearners(species: Species[]): MoveLearners {
  const out: MoveLearners = {};
  for (const s of species) {
    const seen = new Set<string>();
    for (const m of s.moves) {
      if (seen.has(m.name)) continue;
      seen.add(m.name);
      (out[m.name] ??= []).push({ speciesId: s.id, rank: m.rank });
    }
  }
  return out;
}

const byName = <T extends { name: string }>(a: T, b: T) => a.name.localeCompare(b.name, "en");

function readDir(dir: string): Raw[] {
  return readdirSync(dir)
    .filter((f) => f.endsWith(".json"))
    .map((f) => JSON.parse(readFileSync(join(dir, f), "utf8")) as Raw);
}

export function buildAll(srcDir: string) {
  const species = readDir(join(srcDir, "Pokedex"))
    .map(parseSpecies)
    .sort((a, b) => a.number - b.number || a.name.localeCompare(b.name, "en"));
  resolveEvolutionIds(species);
  return {
    species,
    moves: readDir(join(srcDir, "Moves")).map(parseMove).sort(byName),
    abilities: readDir(join(srcDir, "Abilities")).map(parseAbility).sort(byName),
    items: readDir(join(srcDir, "Items")).map(parseItem).sort(byName),
    natures: readDir(join(srcDir, "Natures")).map(parseNature).sort(byName),
    moveLearners: buildMoveLearners(species),
  };
}

function main() {
  const src = process.argv[2];
  if (!src) {
    console.error("Uso: npm run data:build -- <percorso>/Pokerole-Data/v3.0");
    process.exit(1);
  }
  const out = resolve("data");
  mkdirSync(out, { recursive: true });
  const all = buildAll(resolve(src));
  const files: Record<string, unknown> = {
    "species.json": all.species,
    "moves.json": all.moves,
    "abilities.json": all.abilities,
    "items.json": all.items,
    "natures.json": all.natures,
    "move-learners.json": all.moveLearners,
  };
  for (const [name, value] of Object.entries(files)) {
    writeFileSync(join(out, name), JSON.stringify(value));
    const n = Array.isArray(value) ? value.length : Object.keys(value as object).length;
    console.log(`data/${name}: ${n}`);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main();
}
