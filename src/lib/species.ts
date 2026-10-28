import "server-only";
import { and, eq, or } from "drizzle-orm";
import { db } from "@/db";
import { fanmadeSpecies } from "@/db/schema";
import { MOVE_LEARNERS, SPECIES, SPECIES_BY_ID, type Species } from "./data";

export const FANMADE_PREFIX = "fm-";

/** Specie risolta: ufficiale o fanmade (stessa forma di species.json). */
export interface ResolvedSpecies extends Species {
  fanmade: boolean;
  ownerId?: string;
  ownerName?: string;
  shared?: boolean;
  customAbilities: { name: string; effect: string }[];
}

/** Forma di `fanmade_species.data`. */
export type FanmadeData = Partial<Omit<Species, "id" | "name">> & {
  customAbilities?: { name: string; effect: string }[];
};

type FanmadeRow = typeof fanmadeSpecies.$inferSelect;

export function isFanmadeId(id: string): boolean {
  return id.startsWith(FANMADE_PREFIX);
}

function fromFanmade(row: FanmadeRow): ResolvedSpecies {
  const d = row.data as FanmadeData;
  const zero: [number, number] = [1, 1];
  return {
    id: FANMADE_PREFIX + row.id,
    number: d.number ?? 0,
    name: row.name,
    types: d.types ?? [],
    baseHP: d.baseHP ?? 0,
    attributes: {
      strength: d.attributes?.strength ?? zero,
      dexterity: d.attributes?.dexterity ?? zero,
      vitality: d.attributes?.vitality ?? zero,
      special: d.attributes?.special ?? zero,
      insight: d.attributes?.insight ?? zero,
    },
    abilities: d.abilities ?? [],
    hiddenAbility: d.hiddenAbility ?? null,
    eventAbilities: d.eventAbilities ?? "",
    recommendedRank: d.recommendedRank ?? "Starter",
    legendary: d.legendary ?? false,
    goodStarter: d.goodStarter ?? false,
    genderType: d.genderType ?? "",
    heightM: d.heightM ?? 0,
    weightKg: d.weightKg ?? 0,
    category: d.category ?? "",
    description: d.description ?? "",
    image: d.image ?? "",
    evolutions: d.evolutions ?? [],
    moves: d.moves ?? [],
    fanmade: true,
    ownerId: row.ownerId,
    shared: row.shared,
    customAbilities: d.customAbilities ?? [],
  };
}

function fromOfficial(s: Species): ResolvedSpecies {
  return { ...s, fanmade: false, customAbilities: [] };
}

function visibleTo(userId: string | null) {
  return userId
    ? or(eq(fanmadeSpecies.shared, true), eq(fanmadeSpecies.ownerId, userId))
    : eq(fanmadeSpecies.shared, true);
}

/** Fanmade visibili all'utente (condivisi o propri), più recenti per primi. */
export async function visibleFanmade(userId: string | null): Promise<ResolvedSpecies[]> {
  const rows = await db.select().from(fanmadeSpecies).where(visibleTo(userId));
  return rows.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()).map(fromFanmade);
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Specie per id. Per i fanmade controlla la visibilità, salvo `skipVisibility`
 * (Pokémon propri di una specie diventata privata, §14.11).
 */
export async function getSpecies(
  id: string,
  userId: string | null,
  { skipVisibility = false } = {},
): Promise<ResolvedSpecies | null> {
  if (!isFanmadeId(id)) {
    const s = SPECIES_BY_ID.get(id);
    return s ? fromOfficial(s) : null;
  }
  const uuid = id.slice(FANMADE_PREFIX.length);
  if (!UUID.test(uuid)) return null;
  const condition = skipVisibility
    ? eq(fanmadeSpecies.id, uuid)
    : and(eq(fanmadeSpecies.id, uuid), visibleTo(userId));
  const [row] = await db.select().from(fanmadeSpecies).where(condition).limit(1);
  return row ? fromFanmade(row) : null;
}

/** Nomi → id per i link delle evoluzioni (ufficiali e fanmade visibili). */
export function speciesIdByName(extra: ResolvedSpecies[] = []): Map<string, string> {
  const map = new Map(SPECIES.map((s) => [s.name.toLowerCase(), s.id]));
  for (const s of extra) map.set(s.name.toLowerCase(), s.id);
  return map;
}

export interface Learner {
  speciesId: string;
  name: string;
  rank: string;
  fanmade: boolean;
}

/** Chi impara una mossa: learnset ufficiali + fanmade visibili (§5.6). */
export async function moveLearners(moveName: string, userId: string | null): Promise<Learner[]> {
  const official: Learner[] = (MOVE_LEARNERS[moveName] ?? []).map((l) => ({
    speciesId: l.speciesId,
    name: SPECIES_BY_ID.get(l.speciesId)?.name ?? l.speciesId,
    rank: l.rank,
    fanmade: false,
  }));
  const fanmade: Learner[] = [];
  for (const s of await visibleFanmade(userId)) {
    const m = s.moves.find((x) => x.name === moveName);
    if (m) fanmade.push({ speciesId: s.id, name: s.name, rank: m.rank, fanmade: true });
  }
  return [...fanmade, ...official];
}
