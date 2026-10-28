import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { campaigns, pokemon, trainers } from "@/db/schema";

export type Trainer = typeof trainers.$inferSelect;
export type Pokemon = typeof pokemon.$inferSelect;

/** owner = può modificare; master = sola lettura (allenatore di un giocatore collegato). */
export type AccessMode = "owner" | "master";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isUuid = (id: string) => UUID.test(id);

/** Accesso a un allenatore; null = nessun accesso (la pagina risponde 404, §8). */
export async function trainerAccess(
  trainerId: string,
  userId: string,
): Promise<{ trainer: Trainer; mode: AccessMode } | null> {
  if (!isUuid(trainerId)) return null;
  const [trainer] = await db.select().from(trainers).where(eq(trainers.id, trainerId)).limit(1);
  if (!trainer) return null;
  if (trainer.userId === userId) return { trainer, mode: "owner" };
  if (trainer.campaignId && !trainer.npcCampaignId) {
    const [campaign] = await db
      .select({ masterId: campaigns.masterId })
      .from(campaigns)
      .where(eq(campaigns.id, trainer.campaignId))
      .limit(1);
    if (campaign?.masterId === userId) return { trainer, mode: "master" };
  }
  return null;
}

export async function pokemonAccess(
  pokemonId: string,
  userId: string,
): Promise<{ pokemon: Pokemon; trainer: Trainer; mode: AccessMode } | null> {
  if (!isUuid(pokemonId)) return null;
  const [row] = await db.select().from(pokemon).where(eq(pokemon.id, pokemonId)).limit(1);
  if (!row) return null;
  const access = await trainerAccess(row.trainerId, userId);
  return access ? { pokemon: row, ...access } : null;
}

/** Solo il proprietario può modificare: per le server action. */
export async function ownedTrainer(trainerId: string, userId: string) {
  const access = await trainerAccess(trainerId, userId);
  return access?.mode === "owner" ? access.trainer : null;
}

export async function ownedPokemon(pokemonId: string, userId: string) {
  const access = await pokemonAccess(pokemonId, userId);
  return access?.mode === "owner" ? access : null;
}

export type Campaign = typeof campaigns.$inferSelect;

/** Campagna di cui l'utente è master; null = nessun accesso (404). */
export async function masterCampaign(campaignId: string, userId: string): Promise<Campaign | null> {
  if (!isUuid(campaignId)) return null;
  const [campaign] = await db.select().from(campaigns).where(eq(campaigns.id, campaignId)).limit(1);
  return campaign?.masterId === userId ? campaign : null;
}
