import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { requireUser } from "@/auth";
import { db } from "@/db";
import { battles } from "@/db/schema";
import { BattleTracker } from "@/components/BattleTracker";
import { DetailHeader } from "@/components/PageHeader";
import { masterCampaign } from "@/lib/access";
import type { BattleState } from "@/lib/battle";
import { campaignFighters } from "@/lib/battle-data";

type Params = { params: Promise<{ id: string }> };

export const metadata: Metadata = { title: "Battaglia" };

/** Ordine di iniziativa in battaglia (Fase 11): solo il master. */
export default async function BattlePage({ params }: Params) {
  const { id } = await params;
  const user = await requireUser();
  const campaign = await masterCampaign(id, user.id);
  if (!campaign) notFound();

  const fighters = await campaignFighters(campaign.id);
  const [row] = await db.select().from(battles).where(eq(battles.campaignId, campaign.id));
  // I Pokémon che nel frattempo hanno lasciato la campagna (o sono stati eliminati) escono.
  const present = new Set(fighters.map((f) => f.id));
  const battle: BattleState | null = row
    ? {
        combatants: row.combatants.filter((c) => !c.pokemonId || present.has(c.pokemonId)),
      }
    : null;

  return (
    <>
      <DetailHeader
        eyebrow="Master"
        title="Battaglia"
        back={{
          href: `/campagne/${campaign.id}`,
          label: "Torna alla campagna",
          section: campaign.name,
        }}
      />
      <main className="flex flex-col gap-4 p-4 pb-8 lg:px-8 lg:pt-4 lg:pb-10">
        <div className="flex flex-col gap-1">
          <h1 className="h1 hidden lg:block">Battaglia</h1>
          <p className="m-0 text-[15px] text-muted">
            Scegli chi combatte, scrivi l&apos;iniziativa che ha tirato ognuno (1d6 + la base
            indicata) e ordina. Chi va KO esce dall&apos;ordine. La vedi solo tu.
          </p>
        </div>
        <BattleTracker campaignId={campaign.id} fighters={fighters} initial={battle} />
      </main>
    </>
  );
}
