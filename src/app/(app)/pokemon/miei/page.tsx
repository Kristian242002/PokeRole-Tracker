import type { Metadata } from "next";
import { and, asc, eq, isNull } from "drizzle-orm";
import { requireUser } from "@/auth";
import { db } from "@/db";
import { pokemon, trainers } from "@/db/schema";
import { BoxBrowser, type BoxEntry } from "@/components/BoxBrowser";
import { speciesSummaries } from "@/lib/species";
import { teamOrder } from "@/lib/team-order";

export const metadata: Metadata = { title: "I miei Pokémon" };

export default async function MyPokemonPage() {
  const user = await requireUser();
  // Solo gli allenatori propri, non gli NPC delle campagne (§10.7).
  const mine = and(eq(trainers.userId, user.id), isNull(trainers.npcCampaignId));
  const myTrainers = await db
    .select({ id: trainers.id, name: trainers.name })
    .from(trainers)
    .where(mine)
    .orderBy(asc(trainers.createdAt));
  const rows = await db
    .select({
      id: pokemon.id,
      nickname: pokemon.nickname,
      speciesId: pokemon.speciesId,
      rank: pokemon.rank,
      image: pokemon.image,
      trainerId: pokemon.trainerId,
    })
    .from(pokemon)
    .innerJoin(trainers, eq(trainers.id, pokemon.trainerId))
    .where(mine)
    .orderBy(asc(trainers.createdAt), ...teamOrder);

  const species = await speciesSummaries(rows.map((r) => r.speciesId));
  const entries: BoxEntry[] = rows.map((r) => {
    const s = species.get(r.speciesId);
    return {
      id: r.id,
      name: r.nickname || s?.name || r.speciesId,
      species: s?.name ?? r.speciesId,
      types: s?.types ?? [],
      image: r.image ?? s?.image ?? "",
      rank: r.rank,
      trainerId: r.trainerId,
      fanmade: s?.fanmade ?? false,
    };
  });

  return <BoxBrowser entries={entries} trainers={myTrainers} />;
}
