import { describe, expect, it } from "vitest";
import speciesJson from "@data/species.json";
import movesJson from "@data/moves.json";
import naturesJson from "@data/natures.json";
import type { Move, Species } from "@/lib/data-types";
import { isEncounterable } from "@/lib/biomes";
import { moveWeights, optimize, seededRng, type GenSpecies, type MoveInfo } from "@/lib/generator";
import {
  POKEMON_ATTRIBUTES,
  RANKS,
  attributeLimitBonus,
  moveLimit,
  rulesFor,
  type Rank,
} from "@/lib/rules";

const SPECIES = speciesJson as unknown as Species[];
const MOVES = movesJson as unknown as Move[];
const NATURES = (naturesJson as { name: string }[]).map((n) => n.name);
const MOVE_BY_KEY = new Map(MOVES.map((m) => [m.name.toLowerCase(), m]));
const moveInfo = (name: string): MoveInfo | undefined => MOVE_BY_KEY.get(name.toLowerCase());
const options = { hiddenAbility: false, natures: NATURES, moveInfo };

/** Specie inventata per i test: tutti gli attributi da 1 a 5. */
function species(types: string[], moves: { rank: string; name: string }[]): GenSpecies {
  const pair: [number, number] = [1, 5];
  return {
    id: "prova",
    fanmade: false,
    types,
    genderType: "",
    attributes: { strength: pair, dexterity: pair, vitality: pair, special: pair, insight: pair },
    abilities: ["Blaze"],
    hiddenAbility: null,
    moves,
  };
}

const SPECIAL_ONLY = species(
  ["Fire"],
  ["Ember", "Flamethrower", "Fire Blast", "Psychic", "Thunderbolt", "Shadow Ball"].map((name) => ({
    rank: "Starter",
    name,
  })),
);

describe("generatore Ottimizzato (§11.5b)", () => {
  it("un Pokémon con sole mosse Special non riceve punti in Strength", () => {
    for (const rank of RANKS) {
      for (let seed = 0; seed < 5; seed++) {
        const p = optimize(SPECIAL_ONLY, rank, seededRng(seed), options);
        expect(p.attributes.strength).toBe(1);
      }
    }
  });

  it("quota minima a Vitality: 1 punto ogni 4 punti del rank", () => {
    const p = optimize(SPECIAL_ONLY, "Ace", seededRng(1), options); // 10 punti → 2 a Vitality
    expect(p.attributes.vitality).toBeGreaterThanOrEqual(1 + 2);
    expect(p.attributes.special).toBe(5); // peso più alto (danno ×2): arriva al massimo
  });

  it("mosse: prima quelle d'attacco del suo tipo e più potenti, più una Support", () => {
    const s = species(
      ["Fire"],
      ["Ember", "Flamethrower", "Tackle", "Water Gun", "Growl", "Swords Dance"].map((name) => ({
        rank: "Starter",
        name,
      })),
    );
    for (let seed = 0; seed < 10; seed++) {
      const p = optimize(s, "Starter", seededRng(seed), options); // Insight 1 → 4 mosse
      expect(p.moves).toHaveLength(moveLimit(1));
      expect(p.moves).toContain("Flamethrower");
      expect(p.moves).toContain("Ember");
      expect(p.moves.filter((m) => moveInfo(m)!.category === "Support")).toHaveLength(1);
    }
  });

  it("skill: precisione delle mosse al limite, poi Evasion, Alert, Clash", () => {
    const p = optimize(SPECIAL_ONLY, "Rookie", seededRng(2), options); // 10 punti, limite 2
    expect(p.skills.channel).toBe(2);
    expect(p.skills.evasion).toBe(2);
    expect(p.skills.alert).toBe(2);
    expect(p.skills.clash).toBe(2);
    expect(Object.values(p.skills).reduce((n, v) => n + v, 0)).toBe(10);
  });

  it("pesi: danno ×2, precisione ×1, alternative alla più alta", () => {
    const w = moveWeights(
      [moveInfo("Tackle")!, moveInfo("Water Gun")!],
      { strength: 1, dexterity: 1, vitality: 1, special: 3, insight: 1 },
      { channel: 0, athletic: 0 },
    );
    expect(Object.fromEntries(w.attributes)).toEqual({ dexterity: 1, strength: 2, special: 3 });
    expect(Object.fromEntries(w.skills)).toEqual({ athletic: 1, channel: 1 });
  });

  it("stesso seme → stesso risultato", () => {
    const s = { ...SPECIES.find((x) => x.id === "charmander")!, fanmade: false };
    expect(optimize(s, "Standard", seededRng(9), options)).toEqual(
      optimize(s, "Standard", seededRng(9), options),
    );
  });

  it("rispetta le regole del rank su molte specie reali", () => {
    const rng = seededRng(4);
    const sample = SPECIES.filter(isEncounterable).filter((_, i) => i % 29 === 0);
    for (const s of sample) {
      for (const rank of RANKS) {
        const p = optimize({ ...s, fanmade: false }, rank, rng, options);
        const rules = rulesFor(rank);
        const max = (a: (typeof POKEMON_ATTRIBUTES)[number]) =>
          s.attributes[a][1] + attributeLimitBonus(rank);

        // Attributi: tra base e massimo; punti spesi = punti del rank, salvo massimi raggiunti
        // (si perdono solo se Vitality e gli attributi che li ricevono sono tutti al massimo).
        let spent = 0;
        for (const a of POKEMON_ATTRIBUTES) {
          expect(p.attributes[a]).toBeGreaterThanOrEqual(s.attributes[a][0]);
          expect(p.attributes[a]).toBeLessThanOrEqual(max(a));
          spent += p.attributes[a] - s.attributes[a][0];
        }
        expect(spent).toBeLessThanOrEqual(rules.attributePoints);
        if (spent < rules.attributePoints) {
          expect(p.attributes.vitality).toBe(max("vitality"));
          for (const a of POKEMON_ATTRIBUTES) {
            if (p.attributes[a] > s.attributes[a][0]) expect(p.attributes[a]).toBe(max(a));
          }
        }

        // Skill: mai oltre il limite, tutti i punti spesi.
        const skills = Object.values(p.skills);
        expect(skills.every((v) => v <= rules.skillLimit)).toBe(true);
        expect(skills.reduce((n, v) => n + v, 0)).toBe(
          Math.min(rules.skillPoints, skills.length * rules.skillLimit),
        );

        // Mosse: dal learnset a rank ≤, senza doppioni, fino al limite di Insight.
        const allowed = new Set(
          s.moves
            .filter((m) => RANKS.indexOf(m.rank as Rank) <= RANKS.indexOf(rank))
            .map((m) => moveInfo(m.name)?.name)
            .filter(Boolean),
        );
        expect(new Set(p.moves).size).toBe(p.moves.length);
        for (const m of p.moves) expect(allowed.has(m)).toBe(true);
        expect(p.moves.length).toBe(Math.min(allowed.size, moveLimit(p.attributes.insight)));
      }
    }
  });
});
