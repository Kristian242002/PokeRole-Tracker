/**
 * Generatore di Pokémon selvatici (§11.4–11.5b). Puro: dati e RNG arrivano come argomenti,
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

/** Distribuzione dei punti: a caso (§11.4) o ottimizzata per le mosse (§11.5b). */
export type GeneratorMode = "random" | "optimized";

export interface GeneratorSettings {
  mode: GeneratorMode;
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
  types: string[];
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

/** Dati di una mossa usati dal generatore (dal JSON delle mosse). */
export interface MoveInfo {
  name: string;
  type: string;
  category: string;
  power: number;
  accuracy: string[];
  damage: string[];
}

export interface GenOptions {
  hiddenAbility: boolean;
  natures: readonly string[];
  /** Mossa per nome (nome corretto e dati); senza, i nomi del learnset si usano così come sono. */
  moveInfo?: (name: string) => MoveInfo | undefined;
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

/** Mosse del learnset con rank ≤ rank del Pokémon, senza ripetizioni. */
function learnsetPool(
  species: GenSpecies,
  rank: Rank,
  moveInfo: GenOptions["moveInfo"],
): { name: string; info?: MoveInfo }[] {
  const maxRank = RANKS.indexOf(rank);
  const seen = new Map<string, { name: string; info?: MoveInfo }>();
  for (const m of species.moves) {
    const i = RANKS.indexOf(m.rank as Rank);
    if (i < 0 || i > maxRank) continue;
    const info = moveInfo ? moveInfo(m.name) : undefined;
    if (moveInfo && !info) continue; // nome non riconosciuto
    const name = info?.name ?? m.name;
    if (!seen.has(name)) seen.set(name, { name, info });
  }
  return [...seen.values()];
}

/** Sociali, abilità, genere e natura: uguali nelle due modalità (passo 6 di §11.4). */
function finish(
  species: GenSpecies,
  rank: Rank,
  core: Pick<GeneratedPokemon, "attributes" | "skills" | "moves">,
  options: GenOptions,
  rng: Rng,
): GeneratedPokemon {
  const rules = rulesFor(rank);
  const social = Object.fromEntries(
    SOCIAL_ATTRIBUTES.map((s) => [s, 1]),
  ) as GeneratedPokemon["social"];
  distribute(social, rules.socialPoints, () => 5 + attributeLimitBonus(rank), rng);

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
    social,
    ...core,
  };
}

const baseAttributes = (species: GenSpecies) =>
  Object.fromEntries(POKEMON_ATTRIBUTES.map((a) => [a, species.attributes[a][0]])) as Record<
    PokemonAttribute,
    number
  >;
const emptyPokemonSkills = (): Record<string, number> =>
  Object.fromEntries(POKEMON_SKILLS.map((s) => [skillKey(s), 0]));

/** Modalità Casuale (§11.4): punti distribuiti a caso, mosse a caso dal learnset. */
export function generateFor(
  species: GenSpecies,
  rank: Rank,
  options: GenOptions,
  rng: Rng,
): GeneratedPokemon {
  const rules = rulesFor(rank);
  const bonus = attributeLimitBonus(rank);

  const attributes = baseAttributes(species);
  distribute(attributes, rules.attributePoints, (a) => species.attributes[a][1] + bonus, rng);

  const skills = emptyPokemonSkills();
  distribute(skills, rules.skillPoints, () => rules.skillLimit, rng);

  const pool = learnsetPool(species, rank, options.moveInfo).map((m) => m.name);
  const moves: string[] = [];
  const limit = moveLimit(attributes.insight);
  while (moves.length < limit && pool.length > 0) {
    moves.push(pool.splice(Math.floor(rng() * pool.length), 1)[0]);
  }

  return finish(species, rank, { attributes, skills, moves }, options, rng);
}

// ——— Modalità Ottimizzato (§11.5b) ———

const ATTRIBUTE_KEYS = new Set<string>(POKEMON_ATTRIBUTES);
const SKILL_KEYS = new Set(POKEMON_SKILLS.map(skillKey));
const isAttack = (m: MoveInfo) => /Physical|Special/.test(m.category) && m.power > 0;

/**
 * Voce di precisione/danno → attributo o skill del Pokémon. Con alternative ("Channel/Nature")
 * sceglie quella già più alta, altrimenti la prima; ignora attributi sociali e casi speciali.
 */
function resolve(
  token: string | undefined,
  valid: Set<string>,
  current: Record<string, number>,
): string | null {
  const options = (token ?? "")
    .split("/")
    .map((t) => t.trim().toLowerCase())
    .filter((t) => valid.has(t));
  if (options.length === 0) return null;
  return options.reduce((best, t) => ((current[t] ?? 0) > (current[best] ?? 0) ? t : best));
}

export interface MoveWeights {
  attributes: Map<PokemonAttribute, number>;
  skills: Map<string, number>;
}

/** Pesi delle mosse scelte: danno ×2, precisione ×1, skill di precisione ×1. */
export function moveWeights(
  moves: MoveInfo[],
  attributes: Record<PokemonAttribute, number>,
  skills: Record<string, number>,
): MoveWeights {
  const w: MoveWeights = { attributes: new Map(), skills: new Map() };
  const add = <K>(map: Map<K, number>, key: K | null, n: number) => {
    if (key !== null) map.set(key, (map.get(key) ?? 0) + n);
  };
  for (const m of moves) {
    const accuracy = resolve(m.accuracy[0], ATTRIBUTE_KEYS, attributes) as PokemonAttribute | null;
    const damage = resolve(m.damage[0], ATTRIBUTE_KEYS, attributes) as PokemonAttribute | null;
    add(w.attributes, accuracy, 1);
    add(w.attributes, damage, 2);
    add(w.skills, resolve(m.accuracy[1], SKILL_KEYS, skills), 1);
  }
  return w;
}

/**
 * Completa le mosse fino a `count`: mosse d'attacco dello stesso tipo del Pokémon e con potenza
 * più alta (con un po' di casualità tra valori simili), più una Support se disponibile.
 */
function pickMoves(
  pool: { name: string; info?: MoveInfo }[],
  species: GenSpecies,
  count: number,
  chosen: string[],
  rng: Rng,
): string[] {
  const out = [...chosen];
  const free = pool.filter((m) => !out.includes(m.name));
  const attacks = free
    .filter((m) => m.info && isAttack(m.info))
    .map((m) => ({
      name: m.name,
      score: m.info!.power + (species.types.includes(m.info!.type) ? 2 : 0) + rng() * 1.5,
    }))
    .sort((a, b) => b.score - a.score)
    .map((m) => m.name);
  const supports = free.filter((m) => m.info?.category === "Support").map((m) => m.name);
  const others = free
    .map((m) => m.name)
    .filter((n) => !attacks.includes(n) && !supports.includes(n));

  const isSupport = (n: string) => pool.find((m) => m.name === n)?.info?.category === "Support";
  if (!out.some(isSupport) && supports.length && out.length < count) {
    out.push(supports.splice(Math.floor(rng() * supports.length), 1)[0]);
  }
  while (out.length < count && attacks.length) out.push(attacks.shift()!);
  for (const list of [supports, others]) {
    while (out.length < count && list.length) {
      out.push(list.splice(Math.floor(rng() * list.length), 1)[0]);
    }
  }
  return out;
}

/**
 * Modalità Ottimizzato (§11.5b): mosse prima, poi attributi e skill in base ai pesi delle mosse.
 */
export function optimize(
  species: GenSpecies,
  rank: Rank,
  rng: Rng,
  options: GenOptions,
): GeneratedPokemon {
  const rules = rulesFor(rank);
  const bonus = attributeLimitBonus(rank);
  const maxOf = (a: PokemonAttribute) => species.attributes[a][1] + bonus;
  const pool = learnsetPool(species, rank, options.moveInfo);
  const infoOf = (names: string[]) =>
    names.map((n) => pool.find((m) => m.name === n)?.info).filter((m): m is MoveInfo => !!m);

  // 1. Mosse con l'Insight di base.
  const attributes = baseAttributes(species);
  const skills = emptyPokemonSkills();
  let moves = pickMoves(pool, species, moveLimit(attributes.insight), [], rng);
  const weights = moveWeights(infoOf(moves), attributes, skills);

  // 2. Attributi: quota minima a Vitality (1 ogni 4 punti del rank), il resto secondo i pesi.
  let points = rules.attributePoints;
  for (let i = 0; i < Math.floor(rules.attributePoints / 4); i++) {
    if (attributes.vitality >= maxOf("vitality")) break;
    attributes.vitality += 1;
    points -= 1;
  }
  if (weights.attributes.size === 0) {
    distribute(attributes, points, maxOf, rng); // nessuna mossa d'attacco: come in Casuale
    points = 0;
  }
  const given = new Map<PokemonAttribute, number>();
  while (points > 0) {
    // Metodo D'Hondt: il punto va all'attributo con peso / (punti già dati + 1) più alto;
    // se è al massimo, al successivo per peso. Gli attributi con peso 0 restano alla base.
    let best: PokemonAttribute | null = null;
    let bestScore = -1;
    for (const [a, w] of weights.attributes) {
      if (attributes[a] >= maxOf(a)) continue;
      const score = w / ((given.get(a) ?? 0) + 1);
      if (score > bestScore) [best, bestScore] = [a, score];
    }
    if (!best && attributes.vitality < maxOf("vitality")) best = "vitality";
    if (!best) break; // tutto al massimo: i punti avanzati si perdono
    given.set(best, (given.get(best) ?? 0) + 1);
    attributes[best] += 1;
    points -= 1;
  }

  // 3. Se Insight è salito, altre mosse con lo stesso criterio.
  moves = pickMoves(pool, species, moveLimit(attributes.insight), moves, rng);

  // 4. Skill: precisione delle mosse fino al limite, poi Evasion, Alert, Clash; il resto a caso.
  const skillWeights = moveWeights(infoOf(moves), attributes, skills).skills;
  const order = new Set([
    ...[...skillWeights].sort((a, b) => b[1] - a[1]).map(([k]) => k),
    "evasion",
    "alert",
    "clash",
  ]);
  let skillPoints = rules.skillPoints;
  for (const k of order) {
    const add = Math.min(rules.skillLimit - skills[k], skillPoints);
    skills[k] += add;
    skillPoints -= add;
  }
  distribute(skills, skillPoints, () => rules.skillLimit, rng);

  return finish(species, rank, { attributes, skills, moves }, options, rng);
}

/** Pokémon generati per un bioma (§11.4): specie per rarità, rank uniforme nell'intervallo. */
export function generate(
  table: (BiomeEntry & { fanmade: boolean })[],
  speciesById: Map<string, GenSpecies>,
  settings: GeneratorSettings,
  natures: readonly string[],
  rng: Rng,
  moveInfo?: GenOptions["moveInfo"],
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
    const species = speciesById.get(entry.speciesId)!;
    const options = { hiddenAbility: settings.hiddenAbility, natures, moveInfo };
    out.push(
      settings.mode === "optimized"
        ? optimize(species, rank, rng, options)
        : generateFor(species, rank, options, rng),
    );
  }
  return out;
}
