"use server";

import { and, count, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { currentUser } from "@/auth";
import { db } from "@/db";
import { fanmadeSpecies, pokemon } from "@/db/schema";
import { isUuid } from "@/lib/access";
import { deleteOwnBlob } from "@/lib/blob";
import { ABILITIES, SPECIES, findMove } from "@/lib/data";
import { buildFanmade, type FanmadeContext, type FanmadeInput } from "@/lib/fanmade";
import { FANMADE_PREFIX, isFanmadeId, visibleFanmade } from "@/lib/species";
import { NOT_FOUND, fail, ok, type ActionResult } from "./result";

const ABILITY_BY_KEY = new Map(ABILITIES.map((a) => [a.name.toLowerCase(), a.name]));
const OFFICIAL_BY_KEY = new Map(SPECIES.map((s) => [s.name.toLowerCase(), s]));

/** Contesto di validazione: dati ufficiali + fanmade visibili all'autore (§10.9). */
async function context(userId: string): Promise<FanmadeContext> {
  const fanmade = new Map(
    (await visibleFanmade(userId)).map((s) => [s.name.toLowerCase(), s] as const),
  );
  return {
    officialAbility: (name) => ABILITY_BY_KEY.get(name.trim().toLowerCase()),
    officialMove: (name) => findMove(name.trim())?.name,
    species: (name) => {
      const key = name.trim().toLowerCase();
      const s = OFFICIAL_BY_KEY.get(key) ?? fanmade.get(key);
      return s && { id: s.id, name: s.name };
    },
  };
}

/** Il nome non deve confondersi con una specie ufficiale o un altro fanmade visibile. */
async function nameTaken(name: string, userId: string, selfId?: string): Promise<string | null> {
  const key = name.toLowerCase();
  if (OFFICIAL_BY_KEY.has(key)) return `Esiste già una specie ufficiale chiamata ${name}`;
  const clash = (await visibleFanmade(userId)).find(
    (s) => s.name.toLowerCase() === key && s.id !== selfId,
  );
  return clash ? `Esiste già un fanmade chiamato ${name}` : null;
}

/** Fanmade dell'utente (solo l'autore può modificarlo o eliminarlo). */
async function ownedFanmade(speciesId: string, userId: string) {
  if (!isFanmadeId(speciesId)) return null;
  const uuid = speciesId.slice(FANMADE_PREFIX.length);
  if (!isUuid(uuid)) return null;
  const [row] = await db
    .select()
    .from(fanmadeSpecies)
    .where(and(eq(fanmadeSpecies.id, uuid), eq(fanmadeSpecies.ownerId, userId)))
    .limit(1);
  return row ?? null;
}

function revalidateFanmade(speciesId: string) {
  revalidatePath("/fanmade");
  revalidatePath("/dex");
  revalidatePath(`/dex/${speciesId}`);
}

export async function createFanmade(input: FanmadeInput): Promise<ActionResult<{ id: string }>> {
  const user = await currentUser();
  if (!user) return fail("Accedi per creare un fanmade");
  const built = buildFanmade(input, await context(user.id));
  if (!built.ok) return fail(built.error);
  const taken = await nameTaken(built.name, user.id);
  if (taken) return fail(taken);

  const [row] = await db
    .insert(fanmadeSpecies)
    .values({ ownerId: user.id, name: built.name, shared: built.shared, data: built.data })
    .returning({ id: fanmadeSpecies.id });
  const id = FANMADE_PREFIX + row.id;
  revalidateFanmade(id);
  return ok({ id });
}

export async function updateFanmade(
  speciesId: string,
  input: FanmadeInput,
): Promise<ActionResult<{ id: string }>> {
  const user = await currentUser();
  if (!user) return fail(NOT_FOUND);
  const row = await ownedFanmade(speciesId, user.id);
  if (!row) return fail("Fanmade non trovato");
  const built = buildFanmade(input, await context(user.id), speciesId);
  if (!built.ok) return fail(built.error);
  const taken = await nameTaken(built.name, user.id, speciesId);
  if (taken) return fail(taken);

  await db
    .update(fanmadeSpecies)
    .set({ name: built.name, shared: built.shared, data: built.data })
    .where(eq(fanmadeSpecies.id, row.id));
  const oldImage = (row.data as { image?: string }).image;
  if (oldImage !== built.data.image) await deleteOwnBlob(oldImage, user.id);
  revalidateFanmade(speciesId);
  return ok({ id: speciesId });
}

/** Elimina un fanmade; bloccato se esiste un Pokémon di quella specie (§7, §14.12). */
export async function deleteFanmade(speciesId: string): Promise<ActionResult> {
  const user = await currentUser();
  if (!user) return fail(NOT_FOUND);
  const row = await ownedFanmade(speciesId, user.id);
  if (!row) return fail("Fanmade non trovato");

  const [{ n }] = await db
    .select({ n: count() })
    .from(pokemon)
    .where(eq(pokemon.speciesId, speciesId));
  if (n > 0) {
    return fail(
      `Non puoi eliminarlo: ${n === 1 ? "esiste 1 Pokémon" : `esistono ${n} Pokémon`} di questa specie. Puoi renderlo privato.`,
    );
  }

  await db.delete(fanmadeSpecies).where(eq(fanmadeSpecies.id, row.id));
  await deleteOwnBlob((row.data as { image?: string }).image, user.id);
  revalidateFanmade(speciesId);
  redirect("/fanmade");
}
