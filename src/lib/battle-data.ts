import "server-only";
import { and, eq, isNull, or } from "drizzle-orm";
import { db } from "@/db";
import { pokemon, trainers } from "@/db/schema";
import { initiativeBase } from "@/lib/battle";
import { masterBonus, maxHp, shownCurrent } from "@/lib/rules";
import { speciesSummaries } from "@/lib/species";
import { teamOrder } from "@/lib/team-order";

/** Pokémon che può entrare in battaglia, con i valori letti dalla sua scheda. */
export interface Fighter {
  id: string;
  name: string;
  species: string;
  image: string;
  type: string;
  trainerId: string;
  trainer: string;
  /** Allenatore del master (NPC) o di un giocatore. */
  npc: boolean;
  inBox: boolean;
  initiativeBase: number;
  hp: number;
  hpMax: number;
  statuses: string[];
}

/** I Pokémon degli allenatori della campagna: NPC del master e giocatori collegati. */
export async function campaignFighters(campaignId: string): Promise<Fighter[]> {
  const rows = await db
    .select({ p: pokemon, trainerName: trainers.name, npcCampaignId: trainers.npcCampaignId })
    .from(pokemon)
    .innerJoin(trainers, eq(trainers.id, pokemon.trainerId))
    .where(
      or(
        eq(trainers.npcCampaignId, campaignId),
        and(eq(trainers.campaignId, campaignId), isNull(trainers.npcCampaignId)),
      ),
    )
    .orderBy(trainers.name, ...teamOrder);
  const species = await speciesSummaries(rows.map((r) => r.p.speciesId));
  return rows.map(({ p, trainerName, npcCampaignId }) => {
    const s = species.get(p.speciesId);
    const hpMax = maxHp("pokemon", p.attributes.vitality, s?.baseHP ?? 0, p.rank);
    return {
      id: p.id,
      name: p.nickname || s?.name || p.speciesId,
      species: s?.name ?? p.speciesId,
      image: p.image ?? s?.image ?? "",
      type: s?.types[0] ?? "Normal",
      trainerId: p.trainerId,
      trainer: trainerName,
      npc: npcCampaignId !== null,
      inBox: p.inBox,
      initiativeBase: initiativeBase(
        p.attributes.dexterity,
        p.skills.alert ?? 0,
        masterBonus(p.rank),
      ),
      hp: shownCurrent(p.currentHp, hpMax),
      hpMax,
      statuses: p.statuses,
    };
  });
}
