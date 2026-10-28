import { describe, expect, it } from "vitest";
import {
  RANK_ICON,
  RANKS,
  abbreviate,
  accuracyLine,
  categoryLabel,
  damageLine,
  primaryCategory,
} from "@/lib/rules";

describe("righe compatte delle mosse", () => {
  it("abbrevia attributi e skill, lascia invariati i valori sconosciuti", () => {
    expect(abbreviate("Dexterity")).toBe("DEX");
    expect(abbreviate("Channel/Nature")).toBe("CHN/NAT");
    expect(abbreviate("SameAsBaseMove")).toBe("SameAsBaseMove");
  });

  it("compone precisione e danno", () => {
    expect(accuracyLine(["Dexterity", "Channel"])).toBe("A: DEX + CHN");
    expect(damageLine(["Strength"], 2)).toBe("D: STR + 2");
    expect(damageLine([], 0)).toBeNull();
    expect(accuracyLine([])).toBeNull();
  });

  it("traduce le categorie", () => {
    expect(categoryLabel("Physical/Special")).toBe("Fisica / Speciale");
    expect(primaryCategory("Support/Physical/Special")).toBe("Support");
  });
});

describe("rank", () => {
  it("ha un'icona numerata per ogni rank", () => {
    expect(RANKS.map((r) => RANK_ICON[r].num)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
  });
});
