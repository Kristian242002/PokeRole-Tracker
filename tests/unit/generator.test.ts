import { describe, expect, it } from "vitest";
import speciesJson from "@data/species.json";
import naturesJson from "@data/natures.json";
import type { Species } from "@/lib/data-types";
import {
  autoRarity,
  biomeTable,
  evolutionStages,
  isEncounterable,
  type BiomeEntry,
} from "@/lib/biomes";
import { generate, generateFor, pickByRarity, seededRng, type GenSpecies } from "@/lib/generator";
import {
  POKEMON_ATTRIBUTES,
  RANKS,
  attributeLimitBonus,
  moveLimit,
  rulesFor,
  type Rank,
} from "@/lib/rules";

const SPECIES = speciesJson as unknown as Species[];
const NATURES = (naturesJson as { name: string }[]).map((n) => n.name);
const byId = (id: string) => SPECIES.find((s) => s.id === id)!;
const stages = evolutionStages(SPECIES);
const genSpecies = (s: Species): GenSpecies => ({ ...s, fanmade: false });

describe("biomi e rarità automatica", () => {
  it("stadi evolutivi", () => {
    expect(stages.get("barboach")).toBe(1);
    expect(stages.get("whiscash")).toBe(2);
    expect(stages.get("bulbasaur")).toBe(1);
    expect(stages.get("ivysaur")).toBe(2);
    expect(stages.get("venusaur")).toBe(3);
    expect(stages.get("gyarados")).toBe(2);
  });

  it("rarità secondo le regole di §11.2", () => {
    const rarity = (id: string) => autoRarity(byId(id), stages.get(id)!);
    expect(rarity("barboach")).toBe("common"); // stadio 1, evolve, Starter
    expect(rarity("whiscash")).toBe("uncommon"); // stadio 2, Advanced
    expect(rarity("venusaur")).toBe("rare"); // stadio 3
    expect(rarity("magikarp")).toBe("common");
    // Gyarados: stadio 2, rank consigliato Expert (< Ace) → non comune per la regola scritta.
    expect(rarity("gyarados")).toBe("uncommon");
    expect(rarity("mewtwo")).toBe("rare"); // leggendario
  });

  it("niente forme Mega né forme ottenute con Form/Mega", () => {
    expect(isEncounterable(byId("venusaur-mega-form"))).toBe(false);
    expect(isEncounterable(byId("venusaur"))).toBe(true);
    const lake = biomeTable("freshwater", SPECIES, [], stages);
    expect(lake.some((e) => e.speciesId.includes("mega"))).toBe(false);
    expect(lake.find((e) => e.speciesId === "barboach")?.rarity).toBe("common");
    expect(lake.some((e) => e.speciesId === "bulbasaur")).toBe(false);
  });

  it("correzioni del master: aggiungi, togli, cambia rarità", () => {
    const table = biomeTable(
      "freshwater",
      SPECIES,
      [
        { speciesId: "barboach", mode: "add", rarity: "rare" },
        { speciesId: "magikarp", mode: "remove", rarity: null },
        { speciesId: "pikachu", mode: "add", rarity: null },
      ],
      stages,
    );
    const barboach = table.find((e) => e.speciesId === "barboach")!;
    expect(barboach).toMatchObject({ rarity: "rare", autoRarity: "common", overridden: true });
    expect(table.some((e) => e.speciesId === "magikarp")).toBe(false);
    expect(table.find((e) => e.speciesId === "pikachu")?.source).toBe("added");
  });
});

describe("generatore (RNG fisso)", () => {
  it("stesso seme → stesso risultato", () => {
    const a = generateFor(genSpecies(byId("barboach")), "Rookie", opts(), seededRng(42));
    const b = generateFor(genSpecies(byId("barboach")), "Rookie", opts(), seededRng(42));
    expect(a).toEqual(b);
  });

  it("rispetta le regole del rank su molte specie e rank", () => {
    const rng = seededRng(7);
    const sample = SPECIES.filter(isEncounterable).filter((_, i) => i % 37 === 0);
    for (const s of sample) {
      for (const rank of RANKS) {
        const p = generateFor(genSpecies(s), rank, { ...opts(), hiddenAbility: true }, rng);
        const rules = rulesFor(rank);
        const bonus = attributeLimitBonus(rank);

        // Attributi: base + punti del rank, salvo massimi raggiunti.
        let spent = 0;
        let roomLeft = false;
        for (const a of POKEMON_ATTRIBUTES) {
          const [base, max] = s.attributes[a];
          expect(p.attributes[a]).toBeGreaterThanOrEqual(base);
          expect(p.attributes[a]).toBeLessThanOrEqual(max + bonus);
          spent += p.attributes[a] - base;
          if (p.attributes[a] < max + bonus) roomLeft = true;
        }
        if (roomLeft) expect(spent).toBe(rules.attributePoints);
        else expect(spent).toBeLessThanOrEqual(rules.attributePoints);

        // Skill: tutti i punti, nessuna oltre il limite.
        const skills = Object.values(p.skills);
        expect(skills.every((v) => v <= rules.skillLimit)).toBe(true);
        expect(skills.reduce((n, v) => n + v, 0)).toBe(
          Math.min(rules.skillPoints, skills.length * rules.skillLimit),
        );

        // Sociali: 1 + punti del rank.
        const social = Object.values(p.social).reduce((n, v) => n + v - 1, 0);
        expect(social).toBe(rules.socialPoints);

        // Mosse: ≤ Insight + 3, tutte dal learnset a rank ≤, senza doppioni.
        expect(p.moves.length).toBeLessThanOrEqual(moveLimit(p.attributes.insight));
        expect(new Set(p.moves).size).toBe(p.moves.length);
        const allowed = new Set(
          s.moves
            .filter((m) => RANKS.indexOf(m.rank as Rank) <= RANKS.indexOf(rank))
            .map((m) => m.name),
        );
        for (const m of p.moves) expect(allowed.has(m)).toBe(true);
        expect(p.moves.length).toBe(Math.min(allowed.size, moveLimit(p.attributes.insight)));

        // Abilità tra quelle della specie, natura tra le 25, genere secondo genderType.
        expect([...s.abilities, s.hiddenAbility ?? ""]).toContain(p.ability);
        expect(NATURES).toContain(p.nature);
        if (s.genderType === "N") expect(p.gender).toBeNull();
      }
    }
  });

  it("abilità nascosta solo se l'opzione è attiva (~20%)", () => {
    const s = genSpecies(byId("barboach"));
    const rng = seededRng(3);
    let hidden = 0;
    for (let i = 0; i < 1000; i++) {
      if (generateFor(s, "Starter", opts(), rng).ability === s.hiddenAbility) hidden++;
    }
    expect(hidden).toBe(0);
    for (let i = 0; i < 1000; i++) {
      const p = generateFor(s, "Starter", { ...opts(), hiddenAbility: true }, rng);
      if (p.ability === s.hiddenAbility) hidden++;
    }
    expect(hidden).toBeGreaterThan(140);
    expect(hidden).toBeLessThan(260);
  });

  it("rarità 60/30/10 e ridistribuzione se una categoria è vuota", () => {
    const entries = [
      { id: "c", rarity: "common" as const },
      { id: "u", rarity: "uncommon" as const },
      { id: "r", rarity: "rare" as const },
    ];
    const rng = seededRng(11);
    const counts: Record<string, number> = { c: 0, u: 0, r: 0 };
    for (let i = 0; i < 10000; i++) counts[pickByRarity(entries, rng)!.id]++;
    expect(counts.c / 10000).toBeCloseTo(0.6, 1);
    expect(counts.u / 10000).toBeCloseTo(0.3, 1);
    expect(counts.r / 10000).toBeCloseTo(0.1, 1);
    expect(pickByRarity([entries[2]], rng)!.id).toBe("r");
    expect(pickByRarity([], rng)).toBeNull();
  });

  it("generate: quantità, intervallo di rank, leggendari esclusi", () => {
    const table = biomeTable("ruins", SPECIES, [], stages).map((e: BiomeEntry) => ({
      ...e,
      fanmade: false,
    }));
    const speciesById = new Map(SPECIES.map((s) => [s.id, genSpecies(s)]));
    const result = generate(
      table,
      speciesById,
      {
        rankMin: "Standard",
        rankMax: "Rookie",
        quantity: 6,
        legendary: false,
        fanmade: false,
        hiddenAbility: false,
      },
      NATURES,
      seededRng(5),
    );
    expect(result).toHaveLength(6);
    for (const p of result) {
      expect(["Rookie", "Standard"]).toContain(p.rank);
      expect(byId(p.speciesId).legendary).toBe(false);
      expect(byId(p.speciesId).types.some((t) => ["Ghost", "Psychic", "Dark"].includes(t))).toBe(
        true,
      );
    }
  });
});

function opts() {
  return { hiddenAbility: false, natures: NATURES };
}
