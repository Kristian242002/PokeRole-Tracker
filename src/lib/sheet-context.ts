import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { campaigns, users } from "@/db/schema";
import type { TrainerCampaign } from "@/components/sheet/CampaignField";
import type { AccessMode, Trainer } from "./access";

export interface SheetBack {
  href: string;
  label: string;
  section: string;
}

async function campaignOf(campaignId: string) {
  const [row] = await db
    .select({ id: campaigns.id, name: campaigns.name, master: users.username })
    .from(campaigns)
    .innerJoin(users, eq(users.id, campaigns.masterId))
    .where(eq(campaigns.id, campaignId))
    .limit(1);
  return row ?? null;
}

/**
 * Campagna dell'allenatore e destinazione della freccia "indietro":
 * gli NPC e le schede viste dal master tornano alla campagna, le altre agli elenchi personali.
 */
export async function sheetContext(
  trainer: Trainer,
  mode: AccessMode,
  list: "trainers" | "pokemon",
): Promise<{ campaign: TrainerCampaign; back: SheetBack }> {
  const campaignId = trainer.npcCampaignId ?? trainer.campaignId;
  const campaign = campaignId ? await campaignOf(campaignId) : null;

  const toCampaign: SheetBack | null =
    campaign && (trainer.npcCampaignId || mode === "master")
      ? { href: `/campagne/${campaign.id}`, label: "Torna alla campagna", section: campaign.name }
      : null;
  const back =
    toCampaign ??
    (list === "trainers"
      ? { href: "/allenatori", label: "Torna a I miei allenatori", section: "I miei allenatori" }
      : { href: "/pokemon/miei", label: "Torna a I miei Pokémon", section: "I miei Pokémon" });

  return {
    campaign:
      trainer.npcCampaignId && campaign
        ? { kind: "npc", name: campaign.name }
        : { kind: "player", linked: campaign && { name: campaign.name, master: campaign.master } },
    back,
  };
}
