import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { and, asc, eq, isNull } from "drizzle-orm";
import { requireUser } from "@/auth";
import { db } from "@/db";
import { trainers, users } from "@/db/schema";
import { GeneratorPanel } from "@/components/GeneratorPanel";
import { DetailHeader } from "@/components/PageHeader";
import { masterCampaign } from "@/lib/access";

type Params = { params: Promise<{ id: string }> };

export const metadata: Metadata = { title: "Generatore" };

/** Generatore di Pokémon selvatici (§11): solo il master della campagna. */
export default async function GeneratorPage({ params }: Params) {
  const { id } = await params;
  const user = await requireUser();
  const campaign = await masterCampaign(id, user.id);
  if (!campaign) notFound();

  const npcs = await db
    .select({ id: trainers.id, name: trainers.name })
    .from(trainers)
    .where(eq(trainers.npcCampaignId, campaign.id))
    .orderBy(asc(trainers.createdAt));
  const players = await db
    .select({ id: trainers.id, name: trainers.name, user: users.username })
    .from(trainers)
    .innerJoin(users, eq(users.id, trainers.userId))
    .where(and(eq(trainers.campaignId, campaign.id), isNull(trainers.npcCampaignId)))
    .orderBy(asc(users.username), asc(trainers.name));

  return (
    <>
      <DetailHeader
        eyebrow="Master"
        title="Generatore di Pokémon selvatici"
        back={{
          href: `/campagne/${campaign.id}`,
          label: "Torna alla campagna",
          section: campaign.name,
        }}
      />
      <main className="flex flex-col gap-4 p-4 pb-8 lg:px-8 lg:pt-4 lg:pb-10">
        <h1 className="h1 hidden lg:block">Generatore</h1>
        <GeneratorPanel campaignId={campaign.id} npcs={npcs} players={players} />
      </main>
    </>
  );
}
