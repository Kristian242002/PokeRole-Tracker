/**
 * Riquadro avvisi (§6.9): funzione pura, usata lato client e testata.
 * Gli avvisi non bloccano mai il salvataggio.
 */
import {
  ATTRIBUTE_LABEL,
  POKEMON_ATTRIBUTES,
  POKEMON_SKILLS,
  TRAINER_ATTRIBUTES,
  TRAINER_SKILLS,
  attributePointsSpent,
  maxHp,
  maxWill,
  moveLabel,
  moveLimit,
  rulesFor,
  skillKey,
  skillPointsSpent,
  type PokemonAttribute,
  type SheetKind,
} from "./rules";

export interface SheetForWarnings {
  rank: string;
  attributes: Partial<Record<PokemonAttribute, number>>;
  skills: Record<string, number>;
  currentHp: number | null;
  currentWill: number | null;
  moves?: string[];
}

export interface SpeciesForWarnings {
  baseHP: number;
  attributes: Record<PokemonAttribute, [number, number]>;
  moves: { rank: string; name: string }[];
}

const points = (n: number, what: string) => `${n} ${n === 1 ? "punto" : "punti"} ${what}`;

/** "a Starter", "ad Advanced". */
const at = (rank: string) => (/^[aeiou]/i.test(rank) ? `ad ${rank}` : `a ${rank}`);

function budget(lines: string[], spent: number, total: number, what: string) {
  if (spent < total) lines.push(`Ti mancano da spendere ${points(total - spent, what)}`);
  else if (spent > total) lines.push(`Hai ${points(spent - total, what)} oltre il limite del rank`);
}

export function computeWarnings(
  sheet: SheetForWarnings,
  kind: SheetKind,
  species?: SpeciesForWarnings,
): string[] {
  const lines: string[] = [];
  const rules = rulesFor(sheet.rank);
  const attrs = kind === "trainer" ? TRAINER_ATTRIBUTES : POKEMON_ATTRIBUTES;
  const values = Object.fromEntries(attrs.map((a) => [a, sheet.attributes[a] ?? 0]));

  // Punti attributo e skill
  const base =
    kind === "pokemon" && species
      ? Object.fromEntries(attrs.map((a) => [a, species.attributes[a][0]]))
      : 1;
  budget(lines, attributePointsSpent(values, base), rules.attributePoints, "attributo");
  budget(lines, skillPointsSpent(sheet.skills), rules.skillPoints, "skill");

  // Skill sopra il limite del rank
  for (const name of kind === "trainer" ? TRAINER_SKILLS : POKEMON_SKILLS) {
    const v = sheet.skills[skillKey(name)] ?? 0;
    if (v > rules.skillLimit) {
      lines.push(`${name} è a ${v}, ma ${at(sheet.rank)} il massimo è ${rules.skillLimit}`);
    }
  }

  // Attributi del Pokémon fuori dai limiti della specie
  if (kind === "pokemon" && species) {
    for (const a of POKEMON_ATTRIBUTES) {
      const [min, max] = species.attributes[a];
      const v = values[a];
      const label = ATTRIBUTE_LABEL[a];
      if (v > max) lines.push(`${label} è a ${v}, ma il massimo della specie è ${max}`);
      else if (v < min) lines.push(`${label} è a ${v}, sotto la base della specie (${min})`);
    }
  }

  // Mosse
  if (kind === "pokemon" && sheet.moves) {
    const limit = moveLimit(values.insight);
    if (sheet.moves.length > limit) {
      lines.push(`Conosce ${sheet.moves.length} mosse, il limite è ${limit} (Insight + 2)`);
    }
    if (species) {
      for (const move of sheet.moves) {
        const label = moveLabel(move, sheet.rank, species.moves);
        if (label.kind === "outside") lines.push(`${move} è fuori dal learnset`);
        if (label.kind === "above") {
          lines.push(`${move} si impara ${at(label.rank)}, sopra il rank attuale (${sheet.rank})`);
        }
      }
    }
  }

  // HP e Will attuali sopra il massimo
  const hpMax = maxHp(kind, values.vitality, species?.baseHP ?? 0);
  const willMax = maxWill(values.insight);
  if (sheet.currentHp !== null && sheet.currentHp > hpMax) {
    lines.push(`HP attuali (${sheet.currentHp}) sopra il massimo (${hpMax})`);
  }
  if (sheet.currentWill !== null && sheet.currentWill > willMax) {
    lines.push(`Will attuale (${sheet.currentWill}) sopra il massimo (${willMax})`);
  }

  return lines;
}
