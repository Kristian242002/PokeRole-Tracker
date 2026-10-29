"use server";

import { and, eq, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { currentUser } from "@/auth";
import { db } from "@/db";
import { campaigns, pokemon, trainers } from "@/db/schema";
import { isUuid, masterCampaign } from "@/lib/access";
import { deleteOwnBlob } from "@/lib/blob";
import { generateJoinCode } from "@/lib/campaigns";
import { nextPosition } from "@/lib/team-order";
import { newTrainerValues } from "@/lib/trainer";
import { NOT_FOUND, fail, ok, type ActionResult } from "./result";
import { campaignSchema, trainerNameSchema, type CampaignInput } from "./schemas";
import type { CreateTrainerState } from "./trainers";

const CAMPAIGN_NOT_FOUND = "Campagna non trovata";

/** Inserisce con un codice nuovo; riprova in caso (raro) di codice già usato. */
async function withFreshCode<T>(write: (code: string) => Promise<T>): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await write(generateJoinCode());
    } catch (error) {
      const e = error as { code?: string; cause?: { code?: string } };
      const unique = e.code === "23505" || e.cause?.code === "23505";
      if (!unique || attempt >= 4) throw error;
    }
  }
}

export interface CampaignFormState {
  error?: string;
  name: string;
  description: string;
}

/** "Crea campagna" (§10.10): nome e descrizione → crea e apre la campagna. */
export async function createCampaign(
  _prev: CampaignFormState,
  formData: FormData,
): Promise<CampaignFormState> {
  const user = await currentUser();
  if (!user) redirect("/login");
  const raw = {
    name: String(formData.get("name") ?? ""),
    description: String(formData.get("description") ?? ""),
  };
  const parsed = campaignSchema.safeParse(raw);
  if (!parsed.success) return { ...raw, error: parsed.error.issues[0].message };

  const [created] = await withFreshCode((joinCode) =>
    db
      .insert(campaigns)
      .values({ masterId: user.id, ...parsed.data, joinCode })
      .returning({ id: campaigns.id }),
  );
  revalidatePath("/campagne");
  redirect(`/campagne/${created.id}`);
}

export async function updateCampaign(id: string, input: CampaignInput): Promise<ActionResult> {
  const user = await currentUser();
  if (!user || !(await masterCampaign(id, user.id))) return fail(CAMPAIGN_NOT_FOUND);
  const parsed = campaignSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0].message);
  await db.update(campaigns).set(parsed.data).where(eq(campaigns.id, id));
  revalidatePath(`/campagne/${id}`);
  revalidatePath("/campagne");
  return ok(undefined);
}

/** Nuovo codice: quello vecchio smette di funzionare; i giocatori già collegati restano. */
export async function regenerateCode(id: string): Promise<ActionResult<{ code: string }>> {
  const user = await currentUser();
  if (!user || !(await masterCampaign(id, user.id))) return fail(CAMPAIGN_NOT_FOUND);
  const [row] = await withFreshCode((joinCode) =>
    db
      .update(campaigns)
      .set({ joinCode })
      .where(eq(campaigns.id, id))
      .returning({ code: campaigns.joinCode }),
  );
  revalidatePath(`/campagne/${id}`);
  revalidatePath("/campagne");
  return ok({ code: row.code });
}

/** Elimina la campagna con i suoi NPC; i giocatori vengono scollegati (vincoli §7). */
export async function deleteCampaign(id: string): Promise<ActionResult> {
  const user = await currentUser();
  if (!user || !(await masterCampaign(id, user.id))) return fail(CAMPAIGN_NOT_FOUND);
  // Le immagini degli NPC (e dei loro Pokémon) spariscono con la campagna.
  const npcs = await db
    .select({ trainer: trainers.image, pokemon: pokemon.image })
    .from(trainers)
    .leftJoin(pokemon, eq(pokemon.trainerId, trainers.id))
    .where(eq(trainers.npcCampaignId, id));
  await db.delete(campaigns).where(eq(campaigns.id, id));
  for (const url of new Set(npcs.flatMap((r) => [r.trainer, r.pokemon]))) {
    await deleteOwnBlob(url, user.id);
  }
  revalidatePath("/campagne");
  revalidatePath("/allenatori");
  redirect("/campagne");
}

/** Toglie un giocatore dalla campagna (azzera `campaign_id`). */
export async function removePlayer(campaignId: string, trainerId: string): Promise<ActionResult> {
  const user = await currentUser();
  if (!user || !(await masterCampaign(campaignId, user.id))) return fail(CAMPAIGN_NOT_FOUND);
  if (!isUuid(trainerId)) return fail(NOT_FOUND);
  const removed = await db
    .update(trainers)
    .set({ campaignId: null })
    .where(
      and(
        eq(trainers.id, trainerId),
        eq(trainers.campaignId, campaignId),
        isNull(trainers.npcCampaignId),
      ),
    )
    .returning({ id: trainers.id });
  if (removed.length === 0) return fail("Il giocatore non è collegato a questa campagna");
  revalidatePath(`/campagne/${campaignId}`);
  revalidatePath(`/allenatori/${trainerId}`);
  return ok(undefined);
}

/** Nuovo allenatore del master nella campagna (NPC, visibile solo a lui). */
export async function createNpcTrainer(
  campaignId: string,
  _prev: CreateTrainerState,
  formData: FormData,
): Promise<CreateTrainerState> {
  const user = await currentUser();
  if (!user) redirect("/login");
  const raw = String(formData.get("name") ?? "");
  if (!(await masterCampaign(campaignId, user.id))) return { name: raw, error: CAMPAIGN_NOT_FOUND };
  const parsed = trainerNameSchema.safeParse(raw);
  if (!parsed.success) return { name: raw, error: parsed.error.issues[0].message };

  const [created] = await db
    .insert(trainers)
    .values(newTrainerValues(user.id, parsed.data, campaignId))
    .returning({ id: trainers.id });
  revalidatePath(`/campagne/${campaignId}`);
  redirect(`/allenatori/${created.id}`);
}

/**
 * "Invia a…": sposta un Pokémon di un NPC del master all'allenatore di un giocatore
 * collegato alla stessa campagna. Da quel momento è del giocatore.
 */
export async function sendPokemonTo(
  pokemonId: string,
  playerTrainerId: string,
): Promise<ActionResult<{ trainer: string }>> {
  const user = await currentUser();
  if (!user) return fail(NOT_FOUND);
  if (!isUuid(pokemonId) || !isUuid(playerTrainerId)) return fail(NOT_FOUND);

  const [source] = await db
    .select({ campaignId: trainers.npcCampaignId, ownerId: trainers.userId, from: trainers.id })
    .from(pokemon)
    .innerJoin(trainers, eq(trainers.id, pokemon.trainerId))
    .where(eq(pokemon.id, pokemonId))
    .limit(1);
  if (!source?.campaignId || source.ownerId !== user.id) return fail("Pokémon non trovato");
  if (!(await masterCampaign(source.campaignId, user.id))) return fail("Pokémon non trovato");

  const [target] = await db
    .select({ id: trainers.id, name: trainers.name })
    .from(trainers)
    .where(
      and(
        eq(trainers.id, playerTrainerId),
        eq(trainers.campaignId, source.campaignId),
        isNull(trainers.npcCampaignId),
      ),
    )
    .limit(1);
  if (!target) return fail("Quell'allenatore non è collegato a questa campagna");

  await db
    .update(pokemon)
    .set({ trainerId: target.id, position: await nextPosition(target.id) })
    .where(eq(pokemon.id, pokemonId));
  revalidatePath(`/campagne/${source.campaignId}`);
  revalidatePath(`/allenatori/${source.from}`);
  revalidatePath(`/allenatori/${target.id}`);
  revalidatePath(`/pokemon/${pokemonId}`);
  return ok({ trainer: target.name });
}
