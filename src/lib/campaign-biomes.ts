import "server-only";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { campaignBiomes } from "@/db/schema";
import { biomeTable, evolutionStages, type BiomeCode, type BiomeCorrection } from "./biomes";
import { SPECIES } from "./data";
import type { GenSpecies } from "./generator";
import { visibleFanmade, type ResolvedSpecies } from "./species";

const OFFICIAL: ResolvedSpecies[] = SPECIES.map((s) => ({
  ...s,
  fanmade: false,
  customAbilities: [],
}));

/** Specie che il master può incontrare: ufficiali + fanmade visibili a lui (§11.3). */
export async function campaignSpecies(masterId: string): Promise<ResolvedSpecies[]> {
  return [...(await visibleFanmade(masterId)), ...OFFICIAL];
}

export async function biomeCorrections(
  campaignId: string,
  biome?: BiomeCode,
): Promise<(BiomeCorrection & { biome: string })[]> {
  const rows = await db
    .select()
    .from(campaignBiomes)
    .where(
      biome
        ? and(eq(campaignBiomes.campaignId, campaignId), eq(campaignBiomes.biome, biome))
        : eq(campaignBiomes.campaignId, campaignId),
    );
  return rows.map((r) => ({
    biome: r.biome,
    speciesId: r.speciesId,
    mode: r.mode,
    rarity: r.rarity,
  }));
}

/** Tabella effettiva di ogni bioma richiesto, con i dati di specie per il generatore. */
export async function campaignTables(campaignId: string, masterId: string, biomes: BiomeCode[]) {
  const species = await campaignSpecies(masterId);
  const stages = evolutionStages(species);
  const corrections = await biomeCorrections(campaignId);
  const tables = new Map(
    biomes.map((b) => [
      b,
      biomeTable(
        b,
        species,
        corrections.filter((c) => c.biome === b),
        stages,
      ),
    ]),
  );
  return { species, tables };
}

export function toGenSpecies(s: ResolvedSpecies): GenSpecies {
  return {
    id: s.id,
    fanmade: s.fanmade,
    genderType: s.genderType,
    attributes: s.attributes,
    abilities: s.abilities,
    hiddenAbility: s.hiddenAbility,
    moves: s.moves,
  };
}
