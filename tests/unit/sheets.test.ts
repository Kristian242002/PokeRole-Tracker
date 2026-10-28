import { describe, expect, it } from "vitest";
import { evolve, type EvolvableSpecies } from "@/lib/evolution";
import {
  attributePointsSpent,
  maxHp,
  maxWill,
  moveLabel,
  moveLabelText,
  nextRank,
  painPenalty,
  shownCurrent,
} from "@/lib/rules";
import { computeWarnings, type SpeciesForWarnings } from "@/lib/warnings";

const barboach: EvolvableSpecies & SpeciesForWarnings = {
  name: "Barboach",
  baseHP: 3,
  attributes: {
    strength: [2, 4],
    dexterity: [2, 4],
    vitality: [1, 3],
    special: [2, 4],
    insight: [1, 3],
  },
  abilities: ["Oblivious", "Anticipation"],
  hiddenAbility: "Hydration",
  moves: [
    { rank: "Starter", name: "Mud Slap" },
    { rank: "Rookie", name: "Water Gun" },
    { rank: "Expert", name: "Earthquake" },
  ],
};

const whiscash: EvolvableSpecies = {
  name: "Whiscash",
  baseHP: 6,
  attributes: {
    strength: [2, 5],
    dexterity: [2, 4],
    vitality: [2, 5],
    special: [2, 5],
    insight: [2, 5],
  },
  abilities: ["Anticipation", "Hydration"],
  hiddenAbility: null,
};

describe("formule", () => {
  it("HP e Will massimi", () => {
    expect(maxHp("trainer", 2)).toBe(6);
    expect(maxHp("pokemon", 2, 3)).toBe(5);
    expect(maxWill(3)).toBe(6);
  });

  it("valore attuale: null = pieno, limitato al massimo", () => {
    expect(shownCurrent(null, 5)).toBe(5);
    expect(shownCurrent(7, 5)).toBe(5);
    expect(shownCurrent(3, 5)).toBe(3);
  });

  it("penalità da dolore", () => {
    expect(painPenalty(6, 6)).toBe(0);
    expect(painPenalty(4, 6)).toBe(0);
    expect(painPenalty(3, 6)).toBe(1);
    expect(painPenalty(3, 7)).toBe(1);
    expect(painPenalty(4, 7)).toBe(0);
    expect(painPenalty(1, 6)).toBe(2);
    expect(painPenalty(0, 6)).toBe("KO");
  });

  it("rank up: rank successivo", () => {
    expect(nextRank("Standard")).toBe("Advanced");
    expect(nextRank("Champion")).toBeNull();
  });

  it("punti attributo spesi", () => {
    expect(attributePointsSpent({ strength: 3, dexterity: 1 }, 1)).toBe(2);
    expect(attributePointsSpent({ strength: 3, insight: 1 }, { strength: 2, insight: 1 })).toBe(1);
  });
});

describe("etichette delle mosse", () => {
  it("learnset, sopra il rank, fuori learnset", () => {
    expect(moveLabelText(moveLabel("Water Gun", "Rookie", barboach.moves))).toBe(
      "✓ learnset (Rookie)",
    );
    expect(moveLabelText(moveLabel("Earthquake", "Rookie", barboach.moves))).toBe(
      "⚠ sopra il rank (Expert)",
    );
    expect(moveLabelText(moveLabel("Thunder Shock", "Rookie", barboach.moves))).toBe(
      "⚠ fuori learnset",
    );
  });
});

describe("computeWarnings", () => {
  const trainer = {
    rank: "Advanced",
    attributes: { strength: 1, dexterity: 1, vitality: 1, insight: 1 },
    social: { tough: 1, cool: 1, beauty: 1, cute: 1, clever: 1 },
    skills: { lore: 5 },
    currentHp: null,
    currentWill: null,
  };

  it("allenatore Advanced appena creato: punti da spendere e skill sopra il limite", () => {
    expect(computeWarnings(trainer, "trainer")).toEqual([
      "Ti mancano da spendere 6 punti attributo",
      "Ti mancano da spendere 6 punti sociali",
      "Ti mancano da spendere 12 punti skill",
      "Lore è a 5, ma ad Advanced il massimo è 4",
    ]);
  });

  it("punti oltre il limite e HP/Will sopra il massimo", () => {
    const w = computeWarnings(
      {
        rank: "Starter",
        attributes: { strength: 2, dexterity: 1, vitality: 1, insight: 1 },
        social: { tough: 1, cool: 1, beauty: 1, cute: 1, clever: 1 },
        skills: { brawl: 1, alert: 1, nature: 1, stealth: 1, lore: 1, science: 1 },
        currentHp: 9,
        currentWill: 5,
      },
      "trainer",
    );
    expect(w).toEqual([
      "Hai 1 punto attributo oltre il limite del rank",
      "Hai 1 punto skill oltre il limite del rank",
      "HP attuali (9) sopra il massimo (5)",
      "Will attuale (5) sopra il massimo (4)",
    ]);
  });

  it("Pokémon: limiti della specie, mosse oltre il limite, fuori learnset e sopra il rank", () => {
    const w = computeWarnings(
      {
        rank: "Starter",
        attributes: { strength: 5, dexterity: 1, vitality: 1, special: 2, insight: 1 },
        social: { tough: 1, cool: 1, beauty: 1, cute: 1, clever: 1 },
        skills: { brawl: 1, channel: 1, alert: 1, clash: 1, stealth: 1 },
        currentHp: null,
        currentWill: null,
        moves: ["Mud Slap", "Water Gun", "Earthquake", "Tackle", "Splash"],
      },
      "pokemon",
      barboach,
    );
    expect(w).toContain("Strength è a 5, ma il massimo della specie è 4");
    expect(w).toContain("Dexterity è a 1, sotto la base della specie (2)");
    expect(w).toContain("Conosce 5 mosse, il limite è 4 (Insight + 3)");
    expect(w).toContain("Water Gun si impara a Rookie, sopra il rank attuale (Starter)");
    expect(w).toContain("Tackle è fuori dal learnset");
  });

  it("nessun avviso per una scheda in regola", () => {
    expect(
      computeWarnings(
        {
          rank: "Starter",
          attributes: { strength: 2, dexterity: 2, vitality: 1, special: 2, insight: 1 },
          social: { tough: 1, cool: 1, beauty: 1, cute: 1, clever: 1 },
          skills: { brawl: 1, channel: 1, alert: 1, clash: 1, stealth: 1 },
          currentHp: 2,
          currentWill: null,
          moves: ["Mud Slap"],
        },
        "pokemon",
        barboach,
      ),
    ).toEqual([]);
  });
});

describe("regole del manuale (p. 30–31)", () => {
  const champion = {
    rank: "Champion",
    attributes: { strength: 7, dexterity: 8, vitality: 1, insight: 1 },
    social: { tough: 7, cool: 1, beauty: 1, cute: 1, clever: 1 },
    skills: {},
    currentHp: null,
    currentWill: null,
  };

  it("punti sociali da spendere e oltre il limite", () => {
    const rookie = {
      ...champion,
      rank: "Rookie",
      attributes: { strength: 1, dexterity: 1, vitality: 1, insight: 1 },
    };
    expect(
      computeWarnings({ ...rookie, social: { ...rookie.social, tough: 1 } }, "trainer"),
    ).toContain("Ti mancano da spendere 2 punti sociali");
    expect(
      computeWarnings({ ...rookie, social: { ...rookie.social, tough: 5 } }, "trainer"),
    ).toContain("Hai 2 punti sociali oltre il limite del rank");
  });

  it("Champion: attributi fino a 2 oltre il limite", () => {
    const w = computeWarnings(champion, "trainer");
    expect(w).not.toContain("Strength è a 7, ma il massimo è 7");
    expect(w).toContain("Dexterity è a 8, ma il massimo è 7");
    expect(w.some((l) => l.startsWith("Tough"))).toBe(false);
    expect(computeWarnings({ ...champion, rank: "Master" }, "trainer")).toContain(
      "Strength è a 7, ma il massimo è 5",
    );
  });

  it("Master e oltre: HP e Will +3", () => {
    expect(maxHp("trainer", 2, 0, "Ace")).toBe(6);
    expect(maxHp("trainer", 2, 0, "Master")).toBe(9);
    expect(maxHp("pokemon", 2, 3, "Champion")).toBe(8);
    expect(maxWill(3, "Master")).toBe(9);
  });

  it("il Pokémon non può superare il rank dell'allenatore", () => {
    const sheet = {
      rank: "Standard",
      attributes: { strength: 2, dexterity: 2, vitality: 1, special: 2, insight: 1 },
      social: { tough: 1, cool: 1, beauty: 1, cute: 1, clever: 1 },
      skills: {},
      currentHp: null,
      currentWill: null,
      moves: [],
    };
    expect(computeWarnings({ ...sheet, trainerRank: "Rookie" }, "pokemon", barboach)).toContain(
      "Il rank del Pokémon (Standard) supera quello dell'allenatore (Rookie)",
    );
    expect(
      computeWarnings({ ...sheet, trainerRank: "Standard" }, "pokemon", barboach).some((l) =>
        l.startsWith("Il rank del Pokémon"),
      ),
    ).toBe(false);
  });
});

describe("evoluzione (regola B)", () => {
  it("esempio della specifica: Strength 2 con base 1 → base 2 = 3", () => {
    const from = {
      ...barboach,
      attributes: { ...barboach.attributes, strength: [1, 4] as [number, number] },
    };
    const result = evolve(
      {
        attributes: { strength: 2, dexterity: 2, vitality: 1, special: 2, insight: 1 },
        social: { tough: 1, cool: 1, beauty: 1, cute: 1, clever: 1 },
        ability: "Oblivious",
        currentHp: null,
        currentWill: null,
      },
      from,
      whiscash,
    );
    expect(result.pokemon.attributes.strength).toBe(3);
  });

  it("Barboach → Whiscash con i dati reali", () => {
    const result = evolve(
      {
        attributes: { strength: 4, dexterity: 3, vitality: 2, special: 2, insight: 1 },
        social: { tough: 1, cool: 1, beauty: 1, cute: 1, clever: 1 },
        ability: "Hydration",
        currentHp: 9,
        currentWill: 3,
        nickname: "Baffo",
      },
      barboach,
      whiscash,
    );
    // strength: min(5, 2 + 2) = 4; dexterity: min(4, 2 + 1) = 3; vitality: min(5, 2 + 1) = 3;
    // special: 2 + 0 = 2; insight: 2 + 0 = 2
    expect(result.pokemon.attributes).toEqual({
      strength: 4,
      dexterity: 3,
      vitality: 3,
      special: 2,
      insight: 2,
    });
    expect(result.pokemon.ability).toBe("Hydration");
    expect(result.pokemon.nickname).toBe("Baffo");
    expect(result.pokemon.currentHp).toBe(9); // nuovo massimo 6 + 3 = 9
    expect(result.pokemon.currentWill).toBe(3);
    expect(result.summary).toBe(
      "Evoluto da Barboach a Whiscash; Vitality 2 → 3, Insight 1 → 2; nuovi massimi: Strength 5, Vitality 5, Special 5, Insight 5",
    );
  });

  it("abilità non disponibile → prima della nuova specie; HP limitati al nuovo massimo", () => {
    const result = evolve(
      {
        attributes: { strength: 2, dexterity: 2, vitality: 3, special: 2, insight: 1 },
        social: { tough: 1, cool: 1, beauty: 1, cute: 1, clever: 1 },
        ability: "Oblivious",
        currentHp: 20,
        currentWill: null,
      },
      barboach,
      whiscash,
    );
    expect(result.pokemon.ability).toBe("Anticipation");
    expect(result.pokemon.currentHp).toBe(6 + 4);
    expect(result.summary).toContain("abilità: Oblivious → Anticipation");
  });
});
