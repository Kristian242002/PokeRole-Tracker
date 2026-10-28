"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { currentUser } from "@/auth";
import { db } from "@/db";
import { pokemon } from "@/db/schema";
import { ownedPokemon, ownedTrainer, type Pokemon } from "@/lib/access";
import { deleteOwnBlob } from "@/lib/blob";
import { findMove } from "@/lib/data";
import { isOwnBlobUrl } from "@/lib/images";
import { evolve } from "@/lib/evolution";
import { newPokemonValues } from "@/lib/pokemon";
import { RANK_RULES, isRank, nextRank } from "@/lib/rules";
import { getSpecies } from "@/lib/species";
import { LOCKED, NOT_FOUND, fail, ok, type ActionResult } from "./result";
import {
  playStateSchema,
  pokemonUpdateSchema,
  type PlayState,
  type PokemonUpdate,
} from "./schemas";

function revalidatePokemon(p: Pick<Pokemon, "id" | "trainerId">) {
  revalidatePath(`/pokemon/${p.id}`);
  revalidatePath(`/allenatori/${p.trainerId}`);
  revalidatePath("/pokemon/miei");
}

/** Crea un Pokémon della specie indicata per un proprio allenatore e apre la scheda (§10.8). */
export async function createPokemon(trainerId: string, speciesId: string): Promise<ActionResult> {
  const user = await currentUser();
  if (!user) return fail("Accedi per aggiungere Pokémon");
  const trainer = await ownedTrainer(trainerId, user.id);
  if (!trainer) return fail("Allenatore non trovato");
  const species = await getSpecies(speciesId, user.id);
  if (!species) return fail("Specie non trovata");

  const [created] = await db
    .insert(pokemon)
    .values(newPokemonValues(trainer.id, species))
    .returning({ id: pokemon.id, trainerId: pokemon.trainerId });
  revalidatePokemon(created);
  redirect(`/pokemon/${created.id}`);
}

export async function updatePokemon(id: string, input: PokemonUpdate): Promise<ActionResult> {
  const user = await currentUser();
  if (!user) return fail(NOT_FOUND);
  const access = await ownedPokemon(id, user.id);
  if (!access) return fail(NOT_FOUND);
  if (access.pokemon.locked) return fail(LOCKED);
  const parsed = pokemonUpdateSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0].message);
  const unknown = parsed.data.moves.find((m) => !findMove(m));
  if (unknown) return fail(`Mossa sconosciuta: ${unknown}`);

  await db.update(pokemon).set(parsed.data).where(eq(pokemon.id, id));
  revalidatePokemon(access.pokemon);
  return ok(undefined);
}

/** HP, Will, stati e lucchetto: salvati subito, anche a scheda bloccata (§9). */
export async function setPokemonPlayState(id: string, input: PlayState): Promise<ActionResult> {
  const user = await currentUser();
  if (!user) return fail(NOT_FOUND);
  const access = await ownedPokemon(id, user.id);
  if (!access) return fail(NOT_FOUND);
  const parsed = playStateSchema.safeParse(input);
  if (!parsed.success) return fail("Valori non validi");
  if (Object.keys(parsed.data).length === 0) return ok(undefined);

  await db.update(pokemon).set(parsed.data).where(eq(pokemon.id, id));
  revalidatePath(`/allenatori/${access.pokemon.trainerId}`);
  return ok(undefined);
}

export interface SheetChange {
  pokemon: Pokemon;
  summary: string;
}

/** Sali di rank: passa al rank successivo (§6.6). */
export async function rankUp(id: string): Promise<ActionResult<SheetChange>> {
  const user = await currentUser();
  if (!user) return fail(NOT_FOUND);
  const access = await ownedPokemon(id, user.id);
  if (!access) return fail(NOT_FOUND);
  const p = access.pokemon;
  if (p.locked) return fail(LOCKED);
  const next = nextRank(p.rank);
  if (!next) return fail("È già al rank massimo");

  const [updated] = await db
    .update(pokemon)
    .set({ rank: next })
    .where(eq(pokemon.id, id))
    .returning();
  revalidatePokemon(updated);
  const before = isRank(p.rank) ? RANK_RULES[p.rank] : RANK_RULES.Starter;
  const after = RANK_RULES[next];
  return ok({
    pokemon: updated,
    summary:
      `Rank ${p.rank} → ${next}; ` +
      `punti attributo ${before.attributePoints} → ${after.attributePoints}, ` +
      `punti sociali ${before.socialPoints} → ${after.socialPoints}, ` +
      `punti skill ${before.skillPoints} → ${after.skillPoints}, ` +
      `limite skill ${before.skillLimit} → ${after.skillLimit}`,
  });
}

/** Evolve nella specie indicata con la regola B (§6.7). */
export async function evolvePokemon(
  id: string,
  toSpeciesId: string,
): Promise<ActionResult<SheetChange>> {
  const user = await currentUser();
  if (!user) return fail(NOT_FOUND);
  const access = await ownedPokemon(id, user.id);
  if (!access) return fail(NOT_FOUND);
  const p = access.pokemon;
  if (p.locked) return fail(LOCKED);

  const from = await getSpecies(p.speciesId, user.id, { skipVisibility: true });
  if (!from) return fail("Specie attuale non trovata");
  const to = await getSpecies(toSpeciesId, user.id);
  const allowed = to && from.evolutions.some((e) => e.to && (e.toId === to.id || e.to === to.name));
  if (!to || !allowed) {
    return fail("Questa specie non è un'evoluzione possibile");
  }

  const result = evolve(p, from, to);
  const [updated] = await db
    .update(pokemon)
    .set({
      speciesId: to.id,
      attributes: result.pokemon.attributes,
      ability: result.pokemon.ability,
      currentHp: result.pokemon.currentHp,
      currentWill: result.pokemon.currentWill,
    })
    .where(eq(pokemon.id, id))
    .returning();
  revalidatePokemon(updated);
  return ok({ pokemon: updated, summary: result.summary });
}

/** Sposta il Pokémon a un altro dei propri allenatori. */
export async function movePokemonToTrainer(id: string, trainerId: string): Promise<ActionResult> {
  const user = await currentUser();
  if (!user) return fail(NOT_FOUND);
  const access = await ownedPokemon(id, user.id);
  if (!access) return fail(NOT_FOUND);
  const target = await ownedTrainer(trainerId, user.id);
  if (!target) return fail("Allenatore non trovato");

  await db.update(pokemon).set({ trainerId: target.id }).where(eq(pokemon.id, id));
  revalidatePokemon(access.pokemon);
  revalidatePath(`/allenatori/${target.id}`);
  return ok(undefined);
}

export async function deletePokemon(id: string): Promise<ActionResult> {
  const user = await currentUser();
  if (!user) return fail(NOT_FOUND);
  const access = await ownedPokemon(id, user.id);
  if (!access) return fail(NOT_FOUND);
  await db.delete(pokemon).where(eq(pokemon.id, id));
  await deleteOwnBlob(access.pokemon.image, user.id);
  revalidatePokemon(access.pokemon);
  redirect(`/allenatori/${access.pokemon.trainerId}`);
}

/** Immagine personalizzata (§12): un'immagine caricata dall'utente, oppure null = sprite della specie. */
export async function setPokemonImage(id: string, url: string | null): Promise<ActionResult> {
  const user = await currentUser();
  if (!user) return fail(NOT_FOUND);
  const access = await ownedPokemon(id, user.id);
  if (!access) return fail(NOT_FOUND);
  if (access.pokemon.locked) return fail(LOCKED);
  if (url !== null && !isOwnBlobUrl(url, user.id)) return fail("Immagine non valida");

  await db.update(pokemon).set({ image: url }).where(eq(pokemon.id, id));
  if (access.pokemon.image !== url) await deleteOwnBlob(access.pokemon.image, user.id);
  revalidatePokemon(access.pokemon);
  return ok(undefined);
}
