import type { Metadata } from "next";
import Link from "next/link";
import { and, desc, eq, inArray, isNull, isNotNull } from "drizzle-orm";
import { requireUser } from "@/auth";
import { db } from "@/db";
import { campaigns, trainers } from "@/db/schema";
import { CreateCampaignForm } from "@/components/CampaignControls";
import { PageHeader } from "@/components/PageHeader";

export const metadata: Metadata = { title: "Le mie campagne" };

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** Le campagne di cui l'utente è master (§10.10). */
export default async function CampaignsPage() {
  const user = await requireUser();
  const mine = await db
    .select()
    .from(campaigns)
    .where(eq(campaigns.masterId, user.id))
    .orderBy(desc(campaigns.createdAt));
  const ids = mine.map((c) => c.id);
  const players = ids.length
    ? await db
        .select({ campaignId: trainers.campaignId })
        .from(trainers)
        .where(and(inArray(trainers.campaignId, ids), isNull(trainers.npcCampaignId)))
    : [];
  const npcs = ids.length
    ? await db
        .select({ campaignId: trainers.npcCampaignId })
        .from(trainers)
        .where(and(isNotNull(trainers.npcCampaignId), inArray(trainers.npcCampaignId, ids)))
    : [];

  return (
    <>
      <PageHeader
        title="Le mie campagne"
        subtitle="Area master"
        back={{ href: "/altro", label: "Torna al menu" }}
      />
      <main className="flex flex-col gap-4 p-4 lg:px-8 lg:pt-5 lg:pb-10">
        <CreateCampaignForm />
        {mine.length === 0 ? (
          <p className="panel m-0 max-w-xl text-[15px] font-bold text-muted">
            Non sei master di nessuna campagna: creane una qui sopra. Per partecipare a quella di un
            altro master, scrivi il suo codice nella scheda del tuo allenatore.
          </p>
        ) : (
          <ul className="grid gap-4 lg:grid-cols-[repeat(auto-fill,minmax(340px,1fr))] lg:gap-5">
            {mine.map((c) => {
              const nPlayers = players.filter((p) => p.campaignId === c.id).length;
              const nNpcs = npcs.filter((p) => p.campaignId === c.id).length;
              return (
                <li key={c.id}>
                  <Link
                    href={`/campagne/${c.id}`}
                    className="card flex h-full flex-col gap-2.5 p-4 text-ink no-underline hover:text-ink"
                  >
                    <span className="font-display text-[21px] leading-tight font-semibold">
                      {c.name}
                    </span>
                    {c.description && (
                      <span className="line-clamp-2 text-[15px] text-muted">{c.description}</span>
                    )}
                    <span className="flex flex-wrap items-center gap-2.5">
                      <span className="tag tag-info tracking-[0.1em]">{c.joinCode}</span>
                      <span className="text-sm font-bold text-muted">
                        {nPlayers === 0
                          ? "Nessun giocatore collegato"
                          : plural(nPlayers, "giocatore", "giocatori")}{" "}
                        · {plural(nNpcs, "tuo allenatore", "tuoi allenatori")}
                      </span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </main>
    </>
  );
}
