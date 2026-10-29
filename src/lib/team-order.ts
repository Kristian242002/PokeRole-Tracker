import "server-only";
import { asc, eq, max } from "drizzle-orm";
import { db } from "@/db";
import { pokemon } from "@/db/schema";

/** Ordine dei Pokémon di un allenatore (Fase 9): position, poi data di creazione. */
export const teamOrder = [asc(pokemon.position), asc(pokemon.createdAt)];

/** Posizione per un Pokémon che entra nella squadra: in fondo. */
export async function nextPosition(trainerId: string): Promise<number> {
  const [row] = await db
    .select({ last: max(pokemon.position) })
    .from(pokemon)
    .where(eq(pokemon.trainerId, trainerId));
  return row?.last === null || row?.last === undefined ? 0 : row.last + 1;
}
