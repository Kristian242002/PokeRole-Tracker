import { defaultSocial, emptySkills } from "./rules";

/** Valori di un nuovo allenatore (dei giocatori o NPC del master). */
export function newTrainerValues(userId: string, name: string, npcCampaignId?: string) {
  return {
    userId,
    name,
    npcCampaignId: npcCampaignId ?? null,
    attributes: { strength: 1, dexterity: 1, vitality: 1, insight: 1 },
    social: defaultSocial(),
    skills: emptySkills("trainer"),
    statuses: [],
  };
}
