import "server-only";
import type { DexEntry } from "@/components/DexBrowser";
import { SPECIES } from "./data";
import { visibleFanmade } from "./species";

// Versione ridotta delle specie ufficiali: al client arriva solo il necessario (§13).
const OFFICIAL: DexEntry[] = SPECIES.map((s) => ({
  id: s.id,
  number: s.number,
  name: s.name,
  types: s.types,
  image: s.image,
  fanmade: false,
}));

/** Elenco per Pokédex e ricerche: fanmade visibili in cima, poi le ufficiali. */
export async function dexEntries(userId: string | null): Promise<DexEntry[]> {
  const fanmade = (await visibleFanmade(userId)).map((s): DexEntry => ({
    id: s.id,
    number: s.number,
    name: s.name,
    types: s.types,
    image: s.image,
    fanmade: true,
  }));
  return [...fanmade, ...OFFICIAL];
}
