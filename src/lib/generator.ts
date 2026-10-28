/**
 * Generatore di Pokémon selvatici (§11.4). Puro: dati e RNG arrivano come argomenti,
 * così i test usano un RNG con seme fisso.
 */
import { RARITIES, RARITY_WEIGHT, type BiomeEntry, type Rarity } from "./biomes";
import { randomGender } from "./pokemon";
import {
  POKEMON_ATTRIBUTES,
  POKEMON_SKILLS,
  RANKS,
  SOCIAL_ATTRIBUTES,
  attributeLimitBonus,
  moveLimit,
  rulesFor,
  skillKey,
  type PokemonAttribute,
  type Rank,
} from "./rules";

export type Rng = () => number;

/** RNG deterministico (mulberry32) per i test e per riprodurre un risultato. */
export function seededRng(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const pick = <T>(list: readonly T[], rng: Rng): T => list[Math.floor(rng() * list.length)];

export interface GeneratorSettings {
  rankMin: Rank;
  rankMax: Rank;
  quantity: number;
  legendary: boolean;
  fanmade: boolean;
  hiddenAbility: boolean;
}

/** Specie con i dati che servono a generare un Pokémon. */
export interface GenSpecies {
  id: string;
  fanmade: boolean;
  genderType: string;
  attributes: Record<PokemonAttribute, [number, number]>;
  abilities: string[];
  hiddenAbility: string | null;
  moves: { rank: string; name: string }[];
}

export interface GeneratedPokemon {
  speciesId: string;
  rank: Rank;
  gender: "M" | "F" | null;
  nature: string;
  ability: string;
  attributes: Record<PokemonAttribute, number>;
  social: Record<(typeof SOCIAL_ATTRIBUTES)[number], number>;
  skills: Record<string, number>;
  moves: string[];
}

/**
 * Specie per rarità: comune 60, non comune 30, raro 10; se una categoria è vuota
 * il suo peso si ridistribuisce sulle altre; dentro la categoria è uniforme.
 */
export function pickByRarity<E extends { rarity: Rarity }>(entries: E[], rng: Rng): E | null {
  const groups = RARITIES.map((r) => ({ r, list: entries.filter((e) => e.rarity === r) })).filter(
    (g) => g.list.length > 0,
  );
  if (groups.length === 0) return null;
  const total = groups.reduce((n, g) => n + RARITY_WEIGHT[g.r], 0);
  let roll = rng() * total;
  for (const g of groups) {
    roll -= RARITY_WEIGHT[g.r];
    if (roll < 0) return pick(g.list, rng);
  }
  return pick(groups[groups.length - 1].list, rng);
}

/** Distribuisce `points` un punto alla volta su chiavi scelte a caso sotto il proprio massimo. */
function distribute<K extends string>(
  values: Record<K, number>,
  points: number,
  max: (key: K) => number,
  rng: Rng,
) {
  const keys = Object.keys(values) as K[];
  for (let i = 0; i < points; i++) {
    const open = keys.filter((k) => values[k] < max(k));
    if (open.length === 0) return; // tutto al massimo: i punti avanzati si perdono
    values[pick(open, rng)] += 1;
  }
}

/** Un Pokémon della specie data al rank dato (passi 3–6 di §11.4). */
export function generateFor(
  species: GenSpecies,
  rank: Rank,
  options: {
    hiddenAbility: boolean;
    natures: readonly string[];
    moveName?: (n: string) => string | undefined;
  },
  rng: Rng,
): GeneratedPokemon {
  const rules = rulesFor(rank);
  const bonus = attributeLimitBonus(rank);

  const attributes = Object.fromEntries(
    POKEMON_ATTRIBUTES.map((a) => [a, species.attributes[a][0]]),
  ) as Record<PokemonAttribute, number>;
  distribute(attributes, rules.attributePoints, (a) => species.attributes[a][1] + bonus, rng);

  const social = Object.fromEntries(
    SOCIAL_ATTRIBUTES.map((s) => [s, 1]),
  ) as GeneratedPokemon["social"];
  distribute(social, rules.socialPoints, () => 5 + bonus, rng);

  const skills = Object.fromEntries(POKEMON_SKILLS.map((s) => [skillKey(s), 0]));
  distribute(skills, rules.skillPoints, () => rules.skillLimit, rng);

  // Mosse dal learnset con rank ≤ rank del Pokémon, senza ripetizioni, fino a Insight + 3.
  const maxRank = RANKS.indexOf(rank);
  const pool = [
    ...new Set(
      species.moves
        .filter((m) => {
          const i = RANKS.indexOf(m.rank as Rank);
          return i >= 0 && i <= maxRank;
        })
        .map((m) => (options.moveName ? options.moveName(m.name) : m.name))
        .filter((n): n is string => !!n),
    ),
  ];
  const moves: string[] = [];
  const limit = moveLimit(attributes.insight);
  while (moves.length < limit && pool.length > 0) {
    moves.push(pool.splice(Math.floor(rng() * pool.length), 1)[0]);
  }

  const useHidden = options.hiddenAbility && !!species.hiddenAbility && rng() < 0.2;
  const ability = useHidden
    ? species.hiddenAbility!
    : species.abilities.length
      ? pick(species.abilities, rng)
      : (species.hiddenAbility ?? "");

  return {
    speciesId: species.id,
    rank,
    gender: randomGender(species.genderType, rng),
    nature: options.natures.length ? pick(options.natures, rng) : "",
    ability,
    attributes,
    social,
    skills,
    moves,
  };
}

/** Pokémon generati per un bioma (§11.4): specie per rarità, rank uniforme nell'intervallo. */
export function generate(
  table: (BiomeEntry & { fanmade: boolean })[],
  speciesById: Map<string, GenSpecies>,
  settings: GeneratorSettings,
  natures: readonly string[],
  rng: Rng,
  moveName?: (n: string) => string | undefined,
): GeneratedPokemon[] {
  const pool = table.filter(
    (e) =>
      (settings.legendary || !e.legendary) &&
      (settings.fanmade || !e.fanmade) &&
      speciesById.has(e.speciesId),
  );
  let lo = RANKS.indexOf(settings.rankMin);
  let hi = RANKS.indexOf(settings.rankMax);
  if (lo > hi) [lo, hi] = [hi, lo];
  const out: GeneratedPokemon[] = [];
  const quantity = Math.max(1, Math.min(6, settings.quantity));
  for (let i = 0; i < quantity; i++) {
    const entry = pickByRarity(pool, rng);
    if (!entry) break;
    const rank = RANKS[lo + Math.floor(rng() * (hi - lo + 1))];
    out.push(
      generateFor(
        speciesById.get(entry.speciesId)!,
        rank,
        { hiddenAbility: settings.hiddenAbility, natures, moveName },
        rng,
      ),
    );
  }
  return out;
}
