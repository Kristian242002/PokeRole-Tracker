"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { currentUser } from "@/auth";
import { db } from "@/db";
import { battles } from "@/db/schema";
import { masterCampaign } from "@/lib/access";
import { MAX_COMBATANTS, type BattleState } from "@/lib/battle";
import { campaignFighters } from "@/lib/battle-data";
import { fail, ok, type ActionResult } from "./result";

const CAMPAIGN_NOT_FOUND = "Campagna non trovata";

const battleSchema = z.object({
  combatants: z
    .array(
      z.object({
        key: z.string().min(1).max(40),
        pokemonId: z.uuid().nullable(),
        name: z.string().trim().min(1, "Scrivi un nome").max(60, "Nome: massimo 60 caratteri"),
        initiative: z.number().int().min(-99).max(99).nullable(),
        ko: z.boolean(),
      }),
    )
    .max(MAX_COMBATANTS, `Al massimo ${MAX_COMBATANTS} partecipanti`),
});

/** Salva la battaglia della campagna (Fase 11): solo il master, solo Pokémon della campagna. */
export async function saveBattle(campaignId: string, input: BattleState): Promise<ActionResult> {
  const user = await currentUser();
  if (!user || !(await masterCampaign(campaignId, user.id))) return fail(CAMPAIGN_NOT_FOUND);
  const parsed = battleSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0].message);
  const state = parsed.data;
  const keys = new Set(state.combatants.map((c) => c.key));
  if (keys.size !== state.combatants.length) return fail("Partecipanti ripetuti");
  const linked = state.combatants.flatMap((c) => (c.pokemonId ? [c.pokemonId] : []));
  if (linked.length) {
    const allowed = new Set((await campaignFighters(campaignId)).map((f) => f.id));
    if (!linked.every((id) => allowed.has(id))) {
      return fail("Un Pokémon non è più nella campagna: ricarica la pagina");
    }
  }
  // KO sempre in fondo, qualunque cosa arrivi.
  const combatants = [
    ...state.combatants.filter((c) => !c.ko),
    ...state.combatants.filter((c) => c.ko),
  ];

  const values = { combatants };
  await db
    .insert(battles)
    .values({ campaignId, ...values })
    .onConflictDoUpdate({ target: battles.campaignId, set: values });
  revalidatePath(`/campagne/${campaignId}`);
  return ok(undefined);
}

/** "Fine battaglia": la cancella. */
export async function endBattle(campaignId: string): Promise<ActionResult> {
  const user = await currentUser();
  if (!user || !(await masterCampaign(campaignId, user.id))) return fail(CAMPAIGN_NOT_FOUND);
  await db.delete(battles).where(eq(battles.campaignId, campaignId));
  revalidatePath(`/campagne/${campaignId}`);
  return ok(undefined);
}
