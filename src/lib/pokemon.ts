/**
 * Creazione di un Pokémon da una specie (§10.8): attributi = base, sociali = 1,
 * abilità = prima, mosse = quelle Starter del learnset (max 4), genere a caso secondo genderType.
 * Puro, con RNG iniettabile: lo riusa anche il generatore.
 */
import type { pokemon } from "@/db/schema";
import { POKEMON_ATTRIBUTES, defaultSocial, emptySkills, type PokemonAttribute } from "./rules";

export interface SpeciesForCreation {
  id: string;
  genderType: string;
  attributes: Record<PokemonAttribute, [number, number]>;
  abilities: string[];
  moves: { rank: string; name: string }[];
}

export function randomGender(
  genderType: string,
  rng: () => number = Math.random,
): "M" | "F" | null {
  if (genderType === "N") return null;
  if (genderType === "M" || genderType === "F") return genderType;
  return rng() < 0.5 ? "M" : "F";
}

export function newPokemonValues(
  trainerId: string,
  species: SpeciesForCreation,
  rng: () => number = Math.random,
): typeof pokemon.$inferInsert {
  const starters = species.moves.filter((m) => m.rank === "Starter").map((m) => m.name);
  return {
    trainerId,
    speciesId: species.id,
    gender: randomGender(species.genderType, rng),
    attributes: Object.fromEntries(
      POKEMON_ATTRIBUTES.map((a) => [a, species.attributes[a][0]]),
    ) as Record<PokemonAttribute, number>,
    social: defaultSocial(),
    skills: emptySkills("pokemon"),
    ability: species.abilities[0] ?? "",
    moves: [...new Set(starters)].slice(0, 4),
    statuses: [],
  };
}
