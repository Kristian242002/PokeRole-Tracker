import "server-only";
import { and, asc, count, eq, max } from "drizzle-orm";
import { db } from "@/db";
import { pokemon } from "@/db/schema";
import { TEAM_SIZE } from "@/lib/rules";

/** Ordine dei Pokémon di un allenatore: prima la squadra, poi il box (Fase 10); position, poi created_at. */
export const teamOrder = [asc(pokemon.inBox), asc(pokemon.position), asc(pokemon.createdAt)];

/**
 * Posto per un Pokémon che arriva a un allenatore (creato, generato, spostato, inviato):
 * in fondo alla squadra se c'è posto, altrimenti in fondo al box.
 */
export async function nextSlot(trainerId: string): Promise<{ position: number; inBox: boolean }> {
  const [last] = await db
    .select({ last: max(pokemon.position) })
    .from(pokemon)
    .where(eq(pokemon.trainerId, trainerId));
  const [team] = await db
    .select({ n: count() })
    .from(pokemon)
    .where(and(eq(pokemon.trainerId, trainerId), eq(pokemon.inBox, false)));
  const position = last?.last === null || last?.last === undefined ? 0 : last.last + 1;
  return { position, inBox: (team?.n ?? 0) >= TEAM_SIZE };
}
