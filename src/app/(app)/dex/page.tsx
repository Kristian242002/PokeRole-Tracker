import type { Metadata } from "next";
import { currentUser } from "@/auth";
import { DexBrowser, type DexEntry } from "@/components/DexBrowser";
import { SPECIES } from "@/lib/data";
import { visibleFanmade } from "@/lib/species";

export const metadata: Metadata = { title: "Pokédex" };

// Versione ridotta delle specie ufficiali: al client arriva solo il necessario (§13).
const OFFICIAL: DexEntry[] = SPECIES.map((s) => ({
  id: s.id,
  number: s.number,
  name: s.name,
  types: s.types,
  image: s.image,
  fanmade: false,
}));

export default async function DexPage() {
  const user = await currentUser();
  const fanmade = (await visibleFanmade(user?.id ?? null)).map((s): DexEntry => ({
    id: s.id,
    number: s.number,
    name: s.name,
    types: s.types,
    image: s.image,
    fanmade: true,
  }));
  return <DexBrowser entries={[...fanmade, ...OFFICIAL]} />;
}
