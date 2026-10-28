/**
 * Biomi e rarità automatica (§11.1–11.2). Modulo puro: specie e correzioni arrivano come argomenti.
 */
import { RANKS } from "./rules";

export const BIOMES = [
  { code: "forest", name: "Bosco", types: ["Grass", "Bug"] },
  { code: "grassland", name: "Prateria", types: ["Normal", "Grass", "Fairy"] },
  { code: "cave", name: "Grotta", types: ["Rock", "Ground", "Dark", "Poison"] },
  { code: "mountain", name: "Montagna", types: ["Rock", "Fighting", "Steel", "Dragon", "Flying"] },
  { code: "snow", name: "Neve", types: ["Ice"] },
  { code: "sea", name: "Mare", types: ["Water"] },
  { code: "freshwater", name: "Lago / Fiume", types: ["Water"] },
  { code: "swamp", name: "Palude", types: ["Poison", "Water", "Ground"] },
  { code: "desert", name: "Deserto", types: ["Ground", "Fire"] },
  { code: "volcano", name: "Vulcano", types: ["Fire", "Rock"] },
  { code: "city", name: "Città", types: ["Normal", "Electric", "Steel", "Poison"] },
  { code: "ruins", name: "Rovine / Spettrale", types: ["Ghost", "Psychic", "Dark"] },
  { code: "sky", name: "Cielo", types: ["Flying", "Dragon"] },
] as const;

export type BiomeCode = (typeof BIOMES)[number]["code"];
export const BIOME_CODES = BIOMES.map((b) => b.code) as [BiomeCode, ...BiomeCode[]];

export const RARITIES = ["common", "uncommon", "rare"] as const;
export type Rarity = (typeof RARITIES)[number];
export const RARITY_LABEL: Record<Rarity, string> = {
  common: "Comune",
  uncommon: "Non comune",
  rare: "Raro",
};
/** Probabilità di estrazione per categoria (§11.2). */
export const RARITY_WEIGHT: Record<Rarity, number> = { common: 60, uncommon: 30, rare: 10 };

/** Forma minima di una specie (ufficiale o fanmade) per biomi e generatore. */
export interface BiomeSpecies {
  id: string;
  name: string;
  types: string[];
  legendary: boolean;
  recommendedRank: string;
  evolutions: { kind: string; from?: string; fromId?: string; to?: string; toId?: string }[];
}

/** Correzione del master per una specie in un bioma (`campaign_biomes`). */
export interface BiomeCorrection {
  speciesId: string;
  mode: "add" | "remove";
  rarity: Rarity | null;
}

export interface BiomeEntry {
  speciesId: string;
  rarity: Rarity;
  /** Rarità calcolata dalle regole (prima dell'eventuale correzione). */
  autoRarity: Rarity;
  legendary: boolean;
  /** Nella tabella automatica (per tipo) o aggiunta dal master. */
  source: "auto" | "added";
  /** Il master ha cambiato la rarità. */
  overridden: boolean;
}

const isMegaOrForm = (kind: string) => kind === "Mega" || kind === "Form";

/** Forme Mega e forme ottenute con Form/Mega: non si incontrano in natura (§11.1). */
export function isEncounterable(s: BiomeSpecies): boolean {
  if (s.id.includes("mega-form")) return false;
  return !s.evolutions.some((e) => e.from && isMegaOrForm(e.kind));
}

/** "Ha evoluzioni successive" ignorando Mega e forme. */
export function evolvesFurther(s: BiomeSpecies): boolean {
  return s.evolutions.some((e) => e.to && !isMegaOrForm(e.kind));
}

/**
 * Stadio evolutivo di ogni specie: 1 se nessuna specie evolve in lei,
 * 2 se evolve da una di stadio 1, 3 altrimenti (§11.2).
 */
export function evolutionStages(species: BiomeSpecies[]): Map<string, 1 | 2 | 3> {
  const idByName = new Map(species.map((s) => [s.name.toLowerCase(), s.id]));
  const resolve = (id: string | undefined, name: string | undefined) =>
    id ?? (name ? idByName.get(name.toLowerCase()) : undefined);
  const parent = new Map<string, string>();
  for (const s of species) {
    for (const e of s.evolutions) {
      if (isMegaOrForm(e.kind)) continue;
      const from = e.from ? resolve(e.fromId, e.from) : undefined;
      if (from && from !== s.id) parent.set(s.id, from);
      const to = e.to ? resolve(e.toId, e.to) : undefined;
      if (to && to !== s.id && !parent.has(to)) parent.set(to, s.id);
    }
  }
  const stages = new Map<string, 1 | 2 | 3>();
  for (const s of species) {
    let depth = 1;
    let current = s.id;
    const seen = new Set([current]);
    while (parent.has(current) && depth < 3) {
      current = parent.get(current)!;
      if (seen.has(current)) break;
      seen.add(current);
      depth++;
    }
    stages.set(s.id, depth as 1 | 2 | 3);
  }
  return stages;
}

const rankIndex = (r: string) => (RANKS as readonly string[]).indexOf(r);

/** Rarità automatica (§11.2); i leggendari sono "raro" e si filtrano a parte. */
export function autoRarity(s: BiomeSpecies, stage: 1 | 2 | 3): Rarity {
  const rank = rankIndex(s.recommendedRank);
  if (s.legendary) return "rare";
  if (stage === 1 && evolvesFurther(s) && rank <= rankIndex("Standard")) return "common";
  if (stage === 3 || rank >= rankIndex("Ace")) return "rare";
  return "uncommon";
}

/** Specie di un bioma: automatica per tipo + correzioni del master (§11.1). */
export function biomeTable(
  biome: BiomeCode,
  species: BiomeSpecies[],
  corrections: BiomeCorrection[],
  stages: Map<string, 1 | 2 | 3> = evolutionStages(species),
): BiomeEntry[] {
  const types = new Set<string>(BIOMES.find((b) => b.code === biome)?.types ?? []);
  const byId = new Map(species.map((s) => [s.id, s]));
  const fix = new Map(corrections.map((c) => [c.speciesId, c]));
  const entries: BiomeEntry[] = [];
  const entry = (s: BiomeSpecies, source: BiomeEntry["source"]): BiomeEntry => {
    const auto = autoRarity(s, stages.get(s.id) ?? 1);
    const override = fix.get(s.id)?.rarity ?? null;
    return {
      speciesId: s.id,
      rarity: override ?? auto,
      autoRarity: auto,
      legendary: s.legendary,
      source,
      overridden: override !== null && override !== auto,
    };
  };
  for (const s of species) {
    if (fix.get(s.id)?.mode === "remove") continue;
    if (isEncounterable(s) && s.types.some((t) => types.has(t))) entries.push(entry(s, "auto"));
  }
  const included = new Set(entries.map((e) => e.speciesId));
  for (const c of corrections) {
    if (c.mode !== "add" || included.has(c.speciesId)) continue;
    const s = byId.get(c.speciesId);
    if (s) entries.push(entry(s, "added"));
  }
  return entries;
}
