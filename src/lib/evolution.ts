/**
 * Evoluzione, regola B (§6.7). Isolata qui per poterla cambiare facilmente.
 * nuovo = min(maxArrivo, baseArrivo + max(0, vecchio − basePartenza))
 */
import {
  ATTRIBUTE_LABEL,
  POKEMON_ATTRIBUTES,
  maxHp,
  maxWill,
  type PokemonAttribute,
} from "./rules";

export interface EvolvableSpecies {
  name: string;
  baseHP: number;
  attributes: Record<PokemonAttribute, [number, number]>;
  abilities: string[];
  hiddenAbility: string | null;
}

export interface EvolvablePokemon {
  attributes: Record<PokemonAttribute, number>;
  ability: string;
  currentHp: number | null;
  currentWill: number | null;
  rank?: string;
}

export interface EvolutionResult<P> {
  pokemon: P;
  summary: string;
}

export function evolve<P extends EvolvablePokemon>(
  pokemon: P,
  from: EvolvableSpecies,
  to: EvolvableSpecies,
): EvolutionResult<P> {
  const attributes = { ...pokemon.attributes };
  const changed: string[] = [];
  const newMaxima: string[] = [];

  for (const a of POKEMON_ATTRIBUTES) {
    const [fromBase, fromMax] = from.attributes[a];
    const [toBase, toMax] = to.attributes[a];
    const old = pokemon.attributes[a];
    const value = Math.min(toMax, toBase + Math.max(0, old - fromBase));
    attributes[a] = value;
    if (value !== old) changed.push(`${ATTRIBUTE_LABEL[a]} ${old} → ${value}`);
    if (toMax !== fromMax) newMaxima.push(`${ATTRIBUTE_LABEL[a]} ${toMax}`);
  }

  const available = [...to.abilities, ...(to.hiddenAbility ? [to.hiddenAbility] : [])];
  const ability = available.includes(pokemon.ability) ? pokemon.ability : (to.abilities[0] ?? "");

  const hpMax = maxHp("pokemon", attributes.vitality, to.baseHP, pokemon.rank);
  const willMax = maxWill(attributes.insight, pokemon.rank);
  const cap = (v: number | null, max: number) => (v === null ? null : Math.min(v, max));

  const parts = [`Evoluto da ${from.name} a ${to.name}`];
  if (changed.length) parts.push(changed.join(", "));
  if (newMaxima.length) parts.push(`nuovi massimi: ${newMaxima.join(", ")}`);
  if (ability !== pokemon.ability) parts.push(`abilità: ${pokemon.ability || "—"} → ${ability}`);

  return {
    pokemon: {
      ...pokemon,
      attributes,
      ability,
      currentHp: cap(pokemon.currentHp, hpMax),
      currentWill: cap(pokemon.currentWill, willMax),
    },
    summary: parts.join("; "),
  };
}
