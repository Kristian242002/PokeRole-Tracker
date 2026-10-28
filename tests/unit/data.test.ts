import { describe, expect, it } from "vitest";
import species from "@data/species.json";
import moves from "@data/moves.json";
import abilities from "@data/abilities.json";
import items from "@data/items.json";
import natures from "@data/natures.json";
import moveLearners from "@data/move-learners.json";
import {
  buildMoveLearners,
  parseItem,
  parseMove,
  parseSpecies,
  resolveEvolutionIds,
} from "../../scripts/build-data";

describe("data/ generati", () => {
  it("contengono tutti i record", () => {
    expect(species).toHaveLength(1200);
    expect(moves).toHaveLength(892);
    expect(abilities).toHaveLength(305);
    expect(items).toHaveLength(236);
    expect(natures).toHaveLength(25);
  });

  it("Mud Slap ha 84 specie che la imparano", () => {
    expect((moveLearners as Record<string, unknown[]>)["Mud Slap"]).toHaveLength(84);
  });

  it("species è ordinato per numero", () => {
    const numbers = species.map((s) => s.number);
    expect(numbers).toEqual([...numbers].sort((a, b) => a - b));
  });

  it("tutte le evoluzioni puntano a specie esistenti", () => {
    const ids = new Set(species.map((s) => s.id));
    for (const s of species) {
      for (const e of s.evolutions as {
        to?: string;
        toId?: string;
        from?: string;
        fromId?: string;
      }[]) {
        if (e.to) expect(ids.has(e.toId ?? "")).toBe(true);
        if (e.from) expect(ids.has(e.fromId ?? "")).toBe(true);
      }
    }
  });
});

describe("parsing di build-data", () => {
  const barboachRaw = {
    Number: 339,
    Name: "Barboach",
    Type1: "Water",
    Type2: "Ground",
    BaseHP: 3,
    Strength: 2,
    MaxStrength: 4,
    Dexterity: 2,
    MaxDexterity: 4,
    Vitality: 1,
    MaxVitality: 3,
    Special: 2,
    MaxSpecial: 4,
    Insight: 1,
    MaxInsight: 3,
    Ability1: "Oblivious",
    Ability2: "Anticipation",
    HiddenAbility: "Hydration",
    EventAbilities: "",
    RecommendedRank: "Starter",
    GenderType: "",
    Legendary: false,
    GoodStarter: true,
    _id: "barboach",
    DexCategory: "Whiskers Pokémon",
    Height: { Meters: 0.4, Feet: 1.3 },
    Weight: { Kilograms: 2.0, Pounds: 5.0 },
    DexDescription: "…",
    Evolutions: [{ To: "Whiscash", Kind: "Level", Speed: "Medium" }],
    Image: "barboach.png",
    Moves: [
      { Learned: "Starter", Name: "Mud Slap" },
      { Learned: "Rookie", Name: "Water Gun" },
    ],
  };

  it("converte una specie", () => {
    const s = parseSpecies(barboachRaw);
    expect(s).toMatchObject({
      id: "barboach",
      number: 339,
      types: ["Water", "Ground"],
      baseHP: 3,
      hiddenAbility: "Hydration",
      heightM: 0.4,
      weightKg: 2,
      evolutions: [{ to: "Whiscash", kind: "Level", speed: "Medium" }],
      moves: [
        { rank: "Starter", name: "Mud Slap" },
        { rank: "Rookie", name: "Water Gun" },
      ],
    });
    expect(s.attributes.strength).toEqual([2, 4]);
  });

  it("toglie i valori vuoti e risolve gli id delle evoluzioni ignorando gli accenti", () => {
    const a = parseSpecies({
      ...barboachRaw,
      _id: "flabebe",
      Name: "Flabébé",
      Type2: "",
      Ability2: "",
      HiddenAbility: "",
      Evolutions: [],
    });
    const b = parseSpecies({
      ...barboachRaw,
      _id: "floette",
      Name: "Floette",
      Evolutions: [{ From: "Flabebe", Kind: "Level" }],
    });
    expect(a.types).toEqual(["Water"]);
    expect(a.abilities).toEqual(["Oblivious"]);
    expect(a.hiddenAbility).toBeNull();
    resolveEvolutionIds([a, b]);
    expect(b.evolutions[0].fromId).toBe("flabebe");
  });

  it("converte mosse e strumenti", () => {
    const m = parseMove({
      _id: "absorb",
      Name: "Absorb",
      Type: "Grass",
      Power: 1,
      Damage1: "Special",
      Damage2: "",
      Accuracy1: "Vitality",
      Accuracy2: "Channel/Nature",
      Category: "Special",
    });
    expect(m.damage).toEqual(["Special"]);
    expect(m.accuracy).toEqual(["Vitality", "Channel/Nature"]);
    expect(parseItem({ _id: "x", Name: "X", TrainerPrice: "Not for Sale" }).price).toBe(
      "Not for Sale",
    );
    expect(parseItem({ _id: "y", Name: "Y", TrainerPrice: "200" }).price).toBe(200);
  });

  it("indicizza i learner una volta per specie", () => {
    const s = parseSpecies({
      ...barboachRaw,
      Moves: [
        { Learned: "Starter", Name: "Tackle" },
        { Learned: "Rookie", Name: "Tackle" },
      ],
    });
    expect(buildMoveLearners([s])).toEqual({
      Tackle: [{ speciesId: "barboach", rank: "Starter" }],
    });
  });
});
