"use server";

import { and, eq, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { currentUser } from "@/auth";
import { db } from "@/db";
import { pokemon, trainers } from "@/db/schema";
import { masterCampaign } from "@/lib/access";
import { BIOME_CODES } from "@/lib/biomes";
import { campaignTables, toGenSpecies } from "@/lib/campaign-biomes";
import { ABILITIES_BY_NAME, NATURES, findMove } from "@/lib/data";
import { generate, type GeneratedPokemon } from "@/lib/generator";
import {
  POKEMON_ATTRIBUTES,
  POKEMON_SKILLS,
  RANKS,
  SOCIAL_ATTRIBUTES,
  maxHp,
  maxWill,
  skillKey,
} from "@/lib/rules";
import { getSpecies } from "@/lib/species";
import { fail, ok, type ActionResult } from "./result";

const NATURE_NAMES = NATURES.map((n) => n.name);
const CAMPAIGN_NOT_FOUND = "Campagna non trovata";

const settingsSchema = z.object({
  biome: z.enum(BIOME_CODES, "Bioma non valido"),
  mode: z.enum(["random", "optimized"], "Distribuzione non valida"),
  rankMin: z.enum(RANKS),
  rankMax: z.enum(RANKS),
  quantity: z.number().int().min(1, "Da 1 a 6 Pokémon").max(6, "Da 1 a 6 Pokémon"),
  legendary: z.boolean(),
  fanmade: z.boolean(),
  hiddenAbility: z.boolean(),
});
export type GeneratorRequest = z.infer<typeof settingsSchema>;

const score = z.number().int().min(0).max(10);
const generatedSchema = z.object({
  speciesId: z.string().max(80),
  rank: z.enum(RANKS, "Rank non valido"),
  gender: z.enum(["M", "F"]).nullable(),
  nature: z.enum(NATURE_NAMES as [string, ...string[]], "Natura non valida"),
  ability: z.string().max(80),
  attributes: z.object(Object.fromEntries(POKEMON_ATTRIBUTES.map((a) => [a, score]))),
  social: z.object(Object.fromEntries(SOCIAL_ATTRIBUTES.map((a) => [a, score]))),
  skills: z.object(Object.fromEntries(POKEMON_SKILLS.map((s) => [skillKey(s), score]))),
  moves: z.array(z.string().max(80)).max(20),
});

/** Quello che serve per mostrare un Pokémon generato (scheda in sola lettura). */
export interface GeneratedView {
  pokemon: GeneratedPokemon;
  species: {
    name: string;
    types: string[];
    image: string;
    fanmade: boolean;
    attributes: Record<string, [number, number]>;
  };
  abilityEffect: string;
  moves: { name: string; type: string }[];
  hp: number;
  will: number;
}

export async function generatePokemon(
  campaignId: string,
  request: GeneratorRequest,
): Promise<ActionResult<GeneratedView[]>> {
  const user = await currentUser();
  if (!user || !(await masterCampaign(campaignId, user.id))) return fail(CAMPAIGN_NOT_FOUND);
  const parsed = settingsSchema.safeParse(request);
  if (!parsed.success) return fail(parsed.error.issues[0].message);
  const settings = parsed.data;

  const { species, tables } = await campaignTables(campaignId, user.id, [settings.biome]);
  const byId = new Map(species.map((s) => [s.id, s]));
  const table = tables
    .get(settings.biome)!
    .map((e) => ({ ...e, fanmade: byId.get(e.speciesId)?.fanmade ?? false }));
  const result = generate(
    table,
    new Map(species.map((s) => [s.id, toGenSpecies(s)])),
    settings,
    NATURE_NAMES,
    Math.random,
    (name) => findMove(name),
  );
  if (result.length === 0) {
    return fail("Nessuna specie adatta in questo bioma con queste impostazioni");
  }

  return ok(
    result.map((p) => {
      const s = byId.get(p.speciesId)!;
      const custom = s.customAbilities.find((a) => a.name === p.ability);
      return {
        pokemon: p,
        species: {
          name: s.name,
          types: s.types,
          image: s.image,
          fanmade: s.fanmade,
          attributes: s.attributes,
        },
        abilityEffect: custom?.effect ?? ABILITIES_BY_NAME.get(p.ability)?.effect ?? "",
        moves: p.moves.map((m) => ({ name: m, type: findMove(m)?.type ?? "Normal" })),
        hp: maxHp("pokemon", p.attributes.vitality, s.baseHP, p.rank),
        will: maxWill(p.attributes.insight, p.rank),
      };
    }),
  );
}

/** Crea il Pokémon generato per l'allenatore indicato, dopo averlo ricontrollato. */
async function insertGenerated(trainerId: string, input: unknown, userId: string) {
  const parsed = generatedSchema.safeParse(input);
  if (!parsed.success) return fail("Pokémon generato non valido");
  const g = parsed.data;
  const species = await getSpecies(g.speciesId, userId);
  if (!species) return fail("Specie non trovata");
  const moves = g.moves.map((m) => findMove(m)?.name);
  if (moves.some((m) => !m)) return fail("Mossa sconosciuta");

  const [created] = await db
    .insert(pokemon)
    .values({
      trainerId,
      speciesId: species.id,
      rank: g.rank,
      gender: g.gender,
      nature: g.nature,
      ability: g.ability,
      attributes: g.attributes as GeneratedPokemon["attributes"],
      social: g.social as GeneratedPokemon["social"],
      skills: g.skills,
      moves: moves as string[],
      statuses: [],
    })
    .returning({ id: pokemon.id });
  revalidatePath(`/allenatori/${trainerId}`);
  return ok({ id: created.id });
}

/** Salva → su un allenatore del master nella campagna. */
export async function saveGenerated(
  campaignId: string,
  trainerId: string,
  generated: GeneratedPokemon,
): Promise<ActionResult<{ id: string }>> {
  const user = await currentUser();
  if (!user || !(await masterCampaign(campaignId, user.id))) return fail(CAMPAIGN_NOT_FOUND);
  const [npc] = await db
    .select({ id: trainers.id })
    .from(trainers)
    .where(and(eq(trainers.id, trainerId), eq(trainers.npcCampaignId, campaignId)))
    .limit(1);
  if (!npc) return fail("Allenatore non trovato in questa campagna");
  const result = await insertGenerated(npc.id, generated, user.id);
  if (result.ok) revalidatePath(`/campagne/${campaignId}`);
  return result;
}

/** Invia a… → crea il Pokémon direttamente sull'allenatore di un giocatore collegato. */
export async function sendGenerated(
  campaignId: string,
  playerTrainerId: string,
  generated: GeneratedPokemon,
): Promise<ActionResult<{ id: string }>> {
  const user = await currentUser();
  if (!user || !(await masterCampaign(campaignId, user.id))) return fail(CAMPAIGN_NOT_FOUND);
  const [player] = await db
    .select({ id: trainers.id })
    .from(trainers)
    .where(
      and(
        eq(trainers.id, playerTrainerId),
        eq(trainers.campaignId, campaignId),
        isNull(trainers.npcCampaignId),
      ),
    )
    .limit(1);
  if (!player) return fail("Quell'allenatore non è collegato a questa campagna");
  const result = await insertGenerated(player.id, generated, user.id);
  if (result.ok) {
    revalidatePath(`/campagne/${campaignId}`);
    revalidatePath("/pokemon/miei");
  }
  return result;
}
