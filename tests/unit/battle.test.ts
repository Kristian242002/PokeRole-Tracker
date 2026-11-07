import { describe, expect, it } from "vitest";
import type { BattleCombatant } from "@/db/schema";
import { setKo, sortByInitiative } from "@/lib/battle";

const c = (key: string, initiative: number | null, ko = false): BattleCombatant => ({
  key,
  pokemonId: null,
  name: key,
  initiative,
  ko,
});
const keys = (list: BattleCombatant[]) => list.map((x) => x.key);

describe("sortByInitiative", () => {
  it("dal più alto al più basso, senza iniziativa in fondo, pari nell'ordine attuale", () => {
    const sorted = sortByInitiative([c("a", 5), c("b", null), c("c", 9), c("d", 5), c("e", 12)]);
    expect(keys(sorted)).toEqual(["e", "c", "a", "d", "b"]);
  });

  it("i KO non entrano nell'ordine e restano in fondo", () => {
    const sorted = sortByInitiative([c("a", 3), c("k1", 20, true), c("b", 8), c("k2", 15, true)]);
    expect(keys(sorted)).toEqual(["b", "a", "k1", "k2"]);
  });
});

describe("setKo", () => {
  const list = [c("a", 9), c("b", 7), c("c", 5), c("k", 1, true)];

  it("KO: esce dall'ordine e va in fondo alla zona KO", () => {
    const next = setKo(list, "a", true);
    expect(keys(next)).toEqual(["b", "c", "k", "a"]);
    expect(next.find((x) => x.key === "a")?.ko).toBe(true);
  });

  it("rientra: torna in fondo all'ordine, prima dei KO", () => {
    const next = setKo(list, "k", false);
    expect(keys(next)).toEqual(["a", "b", "c", "k"]);
    expect(next.every((x) => !x.ko)).toBe(true);
    expect(keys(setKo([c("a", 1, true), c("b", 2, true)], "b", false))).toEqual(["b", "a"]);
  });

  it("chiave sconosciuta: niente cambia", () => {
    expect(setKo(list, "z", true)).toBe(list);
  });
});
