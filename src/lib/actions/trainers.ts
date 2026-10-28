"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { currentUser } from "@/auth";
import { db } from "@/db";
import { campaigns, pokemon, trainers, users } from "@/db/schema";
import { ownedTrainer } from "@/lib/access";
import { deleteOwnBlob } from "@/lib/blob";
import { normalizeJoinCode } from "@/lib/campaigns";
import { isOwnBlobUrl } from "@/lib/images";
import { newTrainerValues } from "@/lib/trainer";
import { LOCKED, NOT_FOUND, fail, ok, type ActionResult } from "./result";
import {
  playStateSchema,
  trainerNameSchema,
  trainerUpdateSchema,
  type PlayState,
  type TrainerUpdate,
} from "./schemas";

export interface CreateTrainerState {
  error?: string;
  name: string;
}

/** Crea un allenatore con il nome indicato e apre la sua scheda. */
export async function createTrainer(
  _prev: CreateTrainerState,
  formData: FormData,
): Promise<CreateTrainerState> {
  const user = await currentUser();
  if (!user) redirect("/login");
  const raw = String(formData.get("name") ?? "");
  const parsed = trainerNameSchema.safeParse(raw);
  if (!parsed.success) return { name: raw, error: parsed.error.issues[0].message };

  const [created] = await db
    .insert(trainers)
    .values(newTrainerValues(user.id, parsed.data))
    .returning({ id: trainers.id });
  revalidatePath("/allenatori");
  redirect(`/allenatori/${created.id}`);
}

export async function updateTrainer(id: string, input: TrainerUpdate): Promise<ActionResult> {
  const user = await currentUser();
  if (!user) return fail(NOT_FOUND);
  const trainer = await ownedTrainer(id, user.id);
  if (!trainer) return fail(NOT_FOUND);
  if (trainer.locked) return fail(LOCKED);
  const parsed = trainerUpdateSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0].message);

  await db.update(trainers).set(parsed.data).where(eq(trainers.id, id));
  revalidatePath(`/allenatori/${id}`);
  revalidatePath("/allenatori");
  return ok(undefined);
}

/** HP, Will, stati e lucchetto: salvati subito, anche a scheda bloccata (§9). */
export async function setTrainerPlayState(id: string, input: PlayState): Promise<ActionResult> {
  const user = await currentUser();
  if (!user) return fail(NOT_FOUND);
  if (!(await ownedTrainer(id, user.id))) return fail(NOT_FOUND);
  const parsed = playStateSchema.safeParse(input);
  if (!parsed.success) return fail("Valori non validi");
  if (Object.keys(parsed.data).length === 0) return ok(undefined);

  await db.update(trainers).set(parsed.data).where(eq(trainers.id, id));
  return ok(undefined);
}

export async function deleteTrainer(id: string): Promise<ActionResult> {
  const user = await currentUser();
  if (!user) return fail(NOT_FOUND);
  const trainer = await ownedTrainer(id, user.id);
  if (!trainer) return fail(NOT_FOUND);
  const images = await db
    .select({ image: pokemon.image })
    .from(pokemon)
    .where(eq(pokemon.trainerId, id));
  await db.delete(trainers).where(eq(trainers.id, id));
  for (const url of [trainer.image, ...images.map((p) => p.image)]) {
    await deleteOwnBlob(url, user.id);
  }
  if (trainer.npcCampaignId) {
    revalidatePath(`/campagne/${trainer.npcCampaignId}`);
    redirect(`/campagne/${trainer.npcCampaignId}`);
  }
  if (trainer.campaignId) revalidatePath(`/campagne/${trainer.campaignId}`);
  revalidatePath("/allenatori");
  revalidatePath("/pokemon/miei");
  redirect("/allenatori");
}

/** Collega un proprio allenatore a una campagna con il codice del master (§10.6). */
export async function joinCampaign(
  id: string,
  code: string,
): Promise<ActionResult<{ name: string; master: string }>> {
  const user = await currentUser();
  if (!user) return fail(NOT_FOUND);
  const trainer = await ownedTrainer(id, user.id);
  if (!trainer || trainer.npcCampaignId) return fail(NOT_FOUND);
  const joinCode = normalizeJoinCode(code);
  if (!joinCode) return fail("Il codice ha 6 caratteri, lettere e numeri (es. K7MQ2P)");
  const [campaign] = await db
    .select({ id: campaigns.id, name: campaigns.name, master: users.username })
    .from(campaigns)
    .innerJoin(users, eq(users.id, campaigns.masterId))
    .where(eq(campaigns.joinCode, joinCode))
    .limit(1);
  if (!campaign) return fail("Nessuna campagna con questo codice: controllalo con il master");

  await db.update(trainers).set({ campaignId: campaign.id }).where(eq(trainers.id, id));
  if (trainer.campaignId) revalidatePath(`/campagne/${trainer.campaignId}`);
  revalidatePath(`/campagne/${campaign.id}`);
  revalidatePath(`/allenatori/${id}`);
  revalidatePath("/allenatori");
  return ok({ name: campaign.name, master: campaign.master });
}

export async function leaveCampaign(id: string): Promise<ActionResult> {
  const user = await currentUser();
  if (!user) return fail(NOT_FOUND);
  const trainer = await ownedTrainer(id, user.id);
  if (!trainer || trainer.npcCampaignId) return fail(NOT_FOUND);
  await db.update(trainers).set({ campaignId: null }).where(eq(trainers.id, id));
  if (trainer.campaignId) revalidatePath(`/campagne/${trainer.campaignId}`);
  revalidatePath(`/allenatori/${id}`);
  revalidatePath("/allenatori");
  return ok(undefined);
}

/** Ritratto (§12): un'immagine caricata dall'utente, oppure null per toglierlo. */
export async function setTrainerImage(id: string, url: string | null): Promise<ActionResult> {
  const user = await currentUser();
  if (!user) return fail(NOT_FOUND);
  const trainer = await ownedTrainer(id, user.id);
  if (!trainer) return fail(NOT_FOUND);
  if (trainer.locked) return fail(LOCKED);
  if (url !== null && !isOwnBlobUrl(url, user.id)) return fail("Immagine non valida");

  await db.update(trainers).set({ image: url }).where(eq(trainers.id, id));
  if (trainer.image !== url) await deleteOwnBlob(trainer.image, user.id);
  revalidatePath(`/allenatori/${id}`);
  revalidatePath("/allenatori");
  return ok(undefined);
}
