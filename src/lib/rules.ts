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
