/**
 * Regole di gioco (§6). Modulo puro: usabile sia lato server sia lato client.
 */

export const RANKS = [
  "Starter",
  "Rookie",
  "Standard",
  "Advanced",
  "Expert",
  "Ace",
  "Master",
  "Champion",
] as const;
export type Rank = (typeof RANKS)[number];

export interface RankRules {
  maxTargets: number;
  skillLimit: number;
  attributePoints: number;
  skillPoints: number;
  /** TP per salire al rank successivo; null per l'ultimo. */
  tpToNext: number | null;
}

export const RANK_RULES: Record<Rank, RankRules> = {
  Starter: { maxTargets: 1, skillLimit: 1, attributePoints: 0, skillPoints: 5, tpToNext: 5 },
  Rookie: { maxTargets: 2, skillLimit: 2, attributePoints: 2, skillPoints: 10, tpToNext: 15 },
  Standard: { maxTargets: 3, skillLimit: 3, attributePoints: 4, skillPoints: 14, tpToNext: 25 },
  Advanced: { maxTargets: 4, skillLimit: 4, attributePoints: 6, skillPoints: 17, tpToNext: 30 },
  Expert: { maxTargets: 5, skillLimit: 5, attributePoints: 8, skillPoints: 19, tpToNext: 35 },
  Ace: { maxTargets: 6, skillLimit: 5, attributePoints: 10, skillPoints: 20, tpToNext: 40 },
  Master: { maxTargets: 8, skillLimit: 5, attributePoints: 10, skillPoints: 22, tpToNext: 50 },
  Champion: { maxTargets: 10, skillLimit: 5, attributePoints: 14, skillPoints: 25, tpToNext: null },
};

/**
 * Icone dei rank: esagoni numerati e colorati, disegnati per il progetto (dal design).
 * Il colore è la variabile CSS `--color-rank-<chiave>`.
 */
export const RANK_ICON: Record<Rank, { num: number; key: string }> = Object.fromEntries(
  RANKS.map((r, i) => [r, { num: i + 1, key: r.toLowerCase() }]),
) as Record<Rank, { num: number; key: string }>;

export function isRank(value: string): value is Rank {
  return (RANKS as readonly string[]).includes(value);
}

export function rankIndex(rank: string): number {
  return RANKS.indexOf(rank as Rank);
}

export const TYPES = [
  "Normal",
  "Fire",
  "Water",
  "Electric",
  "Grass",
  "Ice",
  "Fighting",
  "Poison",
  "Ground",
  "Flying",
  "Psychic",
  "Bug",
  "Rock",
  "Ghost",
  "Dragon",
  "Dark",
  "Steel",
  "Fairy",
] as const;
export type PokemonType = (typeof TYPES)[number];

/** Sigle di 3 lettere per le righe compatte delle mosse ("A: DEX + CHN"). */
export const ABBREVIATIONS: Record<string, string> = {
  Strength: "STR",
  Dexterity: "DEX",
  Vitality: "VIT",
  Special: "SPC",
  Insight: "INS",
  Tough: "TGH",
  Cool: "COL",
  Beauty: "BTY",
  Cute: "CTE",
  Clever: "CLV",
  Brawl: "BRL",
  Channel: "CHN",
  Clash: "CLS",
  Evasion: "EVA",
  Alert: "ALR",
  Athletic: "ATH",
  Nature: "NAT",
  Stealth: "STL",
  Allure: "ALL",
  Etiquette: "ETQ",
  Intimidate: "ITM",
  Perform: "PRF",
  Will: "WIL",
  Charm: "CHR",
  Empathy: "EMP",
  Throw: "THR",
  Weapons: "WPN",
  Crafts: "CRF",
  Lore: "LOR",
  Medicine: "MED",
  Science: "SCI",
  Happiness: "HAP",
};

/** "Channel/Nature" → "CHN/NAT"; valori sconosciuti restano come sono. */
export function abbreviate(value: string): string {
  return value
    .split("/")
    .map((part) => ABBREVIATIONS[part.trim()] ?? part.trim())
    .join("/");
}

/** Riga di precisione: "A: DEX + CHN". */
export function accuracyLine(accuracy: string[]): string | null {
  if (accuracy.length === 0) return null;
  return "A: " + accuracy.map(abbreviate).join(" + ");
}

/** Riga di danno: "D: STR + 2" (attributo + potenza). */
export function damageLine(damage: string[], power: number): string | null {
  if (damage.length === 0) return null;
  const parts = damage.map(abbreviate);
  if (power > 0) parts.push(String(power));
  return "D: " + parts.join(" + ");
}

export const CATEGORY_LABEL: Record<string, string> = {
  Physical: "Fisica",
  Special: "Speciale",
  Support: "Supporto",
};

export function categoryLabel(category: string): string {
  return category
    .split("/")
    .map((c) => CATEGORY_LABEL[c] ?? c)
    .join(" / ");
}

/** Categoria principale (per l'icona) di valori come "Physical/Special". */
export function primaryCategory(category: string): "Physical" | "Special" | "Support" {
  const first = category.split("/")[0];
  return first === "Physical" || first === "Special" ? first : "Support";
}

// ── Schede (§6.2–6.6) ────────────────────────────────────────────────────────

export const TRAINER_ATTRIBUTES = ["strength", "dexterity", "vitality", "insight"] as const;
export const POKEMON_ATTRIBUTES = [
  "strength",
  "dexterity",
  "vitality",
  "special",
  "insight",
] as const;
export const SOCIAL_ATTRIBUTES = ["tough", "cool", "beauty", "cute", "clever"] as const;

export type TrainerAttribute = (typeof TRAINER_ATTRIBUTES)[number];
export type PokemonAttribute = (typeof POKEMON_ATTRIBUTES)[number];
export type SocialAttribute = (typeof SOCIAL_ATTRIBUTES)[number];

export const ATTRIBUTE_LABEL: Record<PokemonAttribute | SocialAttribute, string> = {
  strength: "Strength",
  dexterity: "Dexterity",
  vitality: "Vitality",
  special: "Special",
  insight: "Insight",
  tough: "Tough",
  cool: "Cool",
  beauty: "Beauty",
  cute: "Cute",
  clever: "Clever",
};

export interface SkillGroup {
  title: string;
  skills: string[];
}

/** Skill dell'allenatore (17), per gruppo. Le chiavi salvate sono in minuscolo. */
export const TRAINER_SKILL_GROUPS: SkillGroup[] = [
  { title: "Fight", skills: ["Brawl", "Throw", "Weapons", "Evasion"] },
  { title: "Survival", skills: ["Alert", "Athletic", "Nature", "Stealth"] },
  { title: "Social", skills: ["Charm", "Empathy", "Etiquette", "Intimidate", "Perform"] },
  { title: "Knowledge", skills: ["Crafts", "Lore", "Medicine", "Science"] },
];

/** Skill del Pokémon (12), per gruppo. */
export const POKEMON_SKILL_GROUPS: SkillGroup[] = [
  { title: "Fight", skills: ["Brawl", "Channel", "Clash", "Evasion"] },
  { title: "Survival", skills: ["Alert", "Athletic", "Nature", "Stealth"] },
  { title: "Social", skills: ["Allure", "Etiquette", "Intimidate", "Perform"] },
];

export const skillKey = (name: string) => name.toLowerCase();
export const TRAINER_SKILLS = TRAINER_SKILL_GROUPS.flatMap((g) => g.skills);
export const POKEMON_SKILLS = POKEMON_SKILL_GROUPS.flatMap((g) => g.skills);

export type SheetKind = "trainer" | "pokemon";

export function emptySkills(kind: SheetKind): Record<string, number> {
  const names = kind === "trainer" ? TRAINER_SKILLS : POKEMON_SKILLS;
  return Object.fromEntries(names.map((s) => [skillKey(s), 0]));
}

export function defaultSocial(): Record<SocialAttribute, number> {
  return { tough: 1, cool: 1, beauty: 1, cute: 1, clever: 1 };
}

/** HP massimi: allenatore Vitality + 4, Pokémon BaseHP + Vitality. */
export function maxHp(kind: SheetKind, vitality: number, baseHP = 0): number {
  return kind === "trainer" ? vitality + 4 : baseHP + vitality;
}

/** Will massimi: Insight + 2. */
export function maxWill(insight: number): number {
  return insight + 2;
}

/** Limite mosse del Pokémon: Insight + 2 (solo avviso). */
export function moveLimit(insight: number): number {
  return insight + 2;
}

/** Valore attuale mostrato: `null` = pieno; sopra il massimo viene limitato. */
export function shownCurrent(current: number | null | undefined, max: number): number {
  if (current === null || current === undefined) return max;
  return Math.max(0, Math.min(current, max));
}

/** Penalità da dolore (§6.4): 0, 1, 2 oppure "KO". */
export function painPenalty(hp: number, max: number): 0 | 1 | 2 | "KO" {
  if (hp <= 0) return "KO";
  if (hp === 1 && max > 1) return 2;
  if (hp <= Math.floor(max / 2)) return 1;
  return 0;
}

export function nextRank(rank: string): Rank | null {
  const i = rankIndex(rank);
  return i >= 0 && i < RANKS.length - 1 ? RANKS[i + 1] : null;
}

/** TP per salire dal rank indicato; null se non si può salire. */
export function rankUpCost(rank: string): number | null {
  return isRank(rank) ? RANK_RULES[rank].tpToNext : null;
}

export function rulesFor(rank: string): RankRules {
  return isRank(rank) ? RANK_RULES[rank] : RANK_RULES.Starter;
}

/** Punti attributo spesi = Σ (valore − base). I sociali non contano. */
export function attributePointsSpent(
  values: Partial<Record<PokemonAttribute, number>>,
  base: Partial<Record<PokemonAttribute, number>> | number,
): number {
  let total = 0;
  for (const [key, value] of Object.entries(values)) {
    const b = typeof base === "number" ? base : (base[key as PokemonAttribute] ?? 0);
    total += (value ?? 0) - b;
  }
  return total;
}

export function skillPointsSpent(skills: Record<string, number>): number {
  return Object.values(skills).reduce((sum, v) => sum + (v || 0), 0);
}

// ── Stati (§6.5) ─────────────────────────────────────────────────────────────

export interface StatusInfo {
  name: string;
  effect: string;
  color: string;
}

export const STATUSES: StatusInfo[] = [
  {
    name: "Burn 1°",
    effect: "1 danno a fine round. Immuni i Fire. Cura: Dex+Athletic, 4 successi cumulativi",
    color: "#c2410c",
  },
  { name: "Burn 2°", effect: "2 danni letali a fine round. Cura: 6 successi", color: "#c2410c" },
  { name: "Burn 3°", effect: "3 danni letali, +2 ogni round. Cura: 8 successi", color: "#c2410c" },
  {
    name: "Confused",
    effect: "Se un'azione fallisce subisci 1 danno; −1/−2/−3 successi in base al rank",
    color: "#c92a62",
  },
  { name: "Disabled", effect: "Una mossa non utilizzabile", color: "#3d3532" },
  {
    name: "Paralysis",
    effect: "−2 Dexterity, metà velocità. Immuni gli Electric",
    color: "#946200",
  },
  { name: "Flinched", effect: "Salta la prossima azione", color: "#6e6e5e" },
  { name: "Poison", effect: "2 danni a fine round. Immuni Poison e Steel", color: "#8e3ba3" },
  { name: "Badly Poisoned", effect: "2 danni letali, +2 ogni round", color: "#8e3ba3" },
  { name: "Frozen", effect: "Nessuna azione. Immuni gli Ice", color: "#0e7490" },
  { name: "In Love", effect: "Metà danni contro il bersaglio", color: "#be185d" },
  {
    name: "Sleep",
    effect: "Nessuna azione; Insight 5 successi cumulativi per svegliarsi",
    color: "#5566c4",
  },
];

// ── Mosse del Pokémon (§6.8) ─────────────────────────────────────────────────

export type MoveLabel =
  { kind: "learnset"; rank: string } | { kind: "above"; rank: string } | { kind: "outside" };

/** Etichetta di una mossa conosciuta rispetto al learnset e al rank attuale. */
export function moveLabel(
  moveName: string,
  currentRank: string,
  learnset: { rank: string; name: string }[],
): MoveLabel {
  const key = moveName.toLowerCase();
  const entries = learnset.filter((m) => m.name.toLowerCase() === key);
  if (entries.length === 0) return { kind: "outside" };
  // Se compare più volte vale il rank più basso.
  const best = entries.reduce((a, b) => (rankIndex(b.rank) < rankIndex(a.rank) ? b : a));
  return rankIndex(best.rank) <= rankIndex(currentRank)
    ? { kind: "learnset", rank: best.rank }
    : { kind: "above", rank: best.rank };
}

export function moveLabelText(label: MoveLabel): string {
  switch (label.kind) {
    case "learnset":
      return `✓ learnset (${label.rank})`;
    case "above":
      return `⚠ sopra il rank (${label.rank})`;
    default:
      return "⚠ fuori learnset";
  }
}
