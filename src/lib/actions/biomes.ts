"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { currentUser } from "@/auth";
import { db } from "@/db";
import { campaignBiomes } from "@/db/schema";
import { masterCampaign } from "@/lib/access";
import { BIOME_CODES, RARITIES, type BiomeCode, type Rarity } from "@/lib/biomes";
import { campaignTables } from "@/lib/campaign-biomes";
import { getSpecies } from "@/lib/species";
import { fail, ok, type ActionResult } from "./result";

const biomeSchema = z.enum(BIOME_CODES, "Bioma non valido");
const raritySchema = z.enum(RARITIES, "Rarità non valida");

/** Controlli comuni: master della campagna, bioma valido, specie visibile al master. */
async function check(campaignId: string, biome: BiomeCode, speciesId?: string) {
  const user = await currentUser();
  if (!user || !(await masterCampaign(campaignId, user.id))) return "Campagna non trovata";
  if (!biomeSchema.safeParse(biome).success) return "Bioma non valido";
  if (speciesId && !(await getSpecies(speciesId, user.id))) return "Specie non trovata";
  return null;
}

async function upsert(
  campaignId: string,
  biome: BiomeCode,
  speciesId: string,
  values: { mode: "add" | "remove"; rarity: Rarity | null },
) {
  await db
    .insert(campaignBiomes)
    .values({ campaignId, biome, speciesId, ...values })
    .onConflictDoUpdate({
      target: [campaignBiomes.campaignId, campaignBiomes.biome, campaignBiomes.speciesId],
      set: values,
    });
  revalidatePath(`/campagne/${campaignId}/biomi`);
}

export async function addToBiome(
  campaignId: string,
  biome: BiomeCode,
  speciesId: string,
): Promise<ActionResult> {
  const error = await check(campaignId, biome, speciesId);
  if (error) return fail(error);
  await upsert(campaignId, biome, speciesId, { mode: "add", rarity: null });
  return ok(undefined);
}

export async function removeFromBiome(
  campaignId: string,
  biome: BiomeCode,
  speciesId: string,
): Promise<ActionResult> {
  const error = await check(campaignId, biome);
  if (error) return fail(error);
  await upsert(campaignId, biome, speciesId, { mode: "remove", rarity: null });
  return ok(undefined);
}

export async function setRarity(
  campaignId: string,
  biome: BiomeCode,
  speciesId: string,
  rarity: Rarity,
): Promise<ActionResult> {
  const error = await check(campaignId, biome, speciesId);
  if (error) return fail(error);
  if (!raritySchema.safeParse(rarity).success) return fail("Rarità non valida");
  await upsert(campaignId, biome, speciesId, { mode: "add", rarity });
  return ok(undefined);
}

/** Ripristina la tabella automatica del bioma (toglie tutte le correzioni). */
export async function resetBiome(campaignId: string, biome: BiomeCode): Promise<ActionResult> {
  const error = await check(campaignId, biome);
  if (error) return fail(error);
  await db
    .delete(campaignBiomes)
    .where(and(eq(campaignBiomes.campaignId, campaignId), eq(campaignBiomes.biome, biome)));
  revalidatePath(`/campagne/${campaignId}/biomi`);
  return ok(undefined);
}

export interface BiomeSpeciesView {
  speciesId: string;
  name: string;
  image: string;
  type: string;
  fanmade: boolean;
  rarity: Rarity;
  legendary: boolean;
  source: "auto" | "added";
  overridden: boolean;
}

/** Specie di un bioma, caricate quando il master lo apre (la pagina manda solo i riepiloghi). */
export async function loadBiome(
  campaignId: string,
  biome: BiomeCode,
): Promise<
  ActionResult<{
    entries: BiomeSpeciesView[];
    addable: { id: string; name: string; fanmade: boolean }[];
  }>
> {
  const user = await currentUser();
  if (!user || !(await masterCampaign(campaignId, user.id))) return fail("Campagna non trovata");
  if (!biomeSchema.safeParse(biome).success) return fail("Bioma non valido");
  const { species, tables } = await campaignTables(campaignId, user.id, [biome]);
  const byId = new Map(species.map((s) => [s.id, s]));
  const entries = tables.get(biome)!.map((e) => {
    const s = byId.get(e.speciesId)!;
    return {
      speciesId: e.speciesId,
      name: s.name,
      image: s.image,
      type: s.types[0] ?? "Normal",
      fanmade: s.fanmade,
      rarity: e.rarity,
      legendary: e.legendary,
      source: e.source,
      overridden: e.overridden,
    };
  });
  const included = new Set(entries.map((e) => e.speciesId));
  const addable = species
    .filter((s) => !included.has(s.id))
    .map((s) => ({ id: s.id, name: s.name, fanmade: s.fanmade }));
  return ok({ entries, addable });
}
