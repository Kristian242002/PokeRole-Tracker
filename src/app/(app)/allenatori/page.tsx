import type { Metadata } from "next";
import Link from "next/link";
import { and, asc, eq, inArray, isNull } from "drizzle-orm";
import { requireUser } from "@/auth";
import { db } from "@/db";
import { campaigns, pokemon, trainers } from "@/db/schema";
import { CreateTrainerForm } from "@/components/CreateTrainerForm";
import { PageHeader } from "@/components/PageHeader";
import { RankLabel } from "@/components/RankIcon";
import { Sprite } from "@/components/Sprite";
import { TrainerPortrait } from "@/components/TrainerPortrait";
import { typeStyle } from "@/components/TypeBadge";
import { speciesSummaries } from "@/lib/species";
import { teamOrder } from "@/lib/team-order";

export const metadata: Metadata = { title: "I miei allenatori" };

export default async function TrainersPage() {
  const user = await requireUser();
  const mine = await db
    .select({
      id: trainers.id,
      name: trainers.name,
      rank: trainers.rank,
      image: trainers.image,
      campaign: campaigns.name,
    })
    .from(trainers)
    .leftJoin(campaigns, eq(campaigns.id, trainers.campaignId))
    .where(and(eq(trainers.userId, user.id), isNull(trainers.npcCampaignId)))
    .orderBy(asc(trainers.createdAt));

  const team = mine.length
    ? await db
        .select({
          id: pokemon.id,
          trainerId: pokemon.trainerId,
          speciesId: pokemon.speciesId,
          inBox: pokemon.inBox,
        })
        .from(pokemon)
        .where(
          inArray(
            pokemon.trainerId,
            mine.map((t) => t.id),
          ),
        )
        .orderBy(...teamOrder)
    : [];
  const species = await speciesSummaries(team.map((p) => p.speciesId));
  const total = team.length;

  return (
    <>
      <PageHeader
        title="I miei allenatori"
        subtitle={`${mine.length} ${mine.length === 1 ? "allenatore" : "allenatori"} · ${total} Pokémon`}
      />
      <main className="flex flex-col gap-4 p-4 lg:px-8 lg:pt-5 lg:pb-10">
        <CreateTrainerForm />
        {mine.length === 0 ? (
          <p className="panel max-w-xl text-[15px] font-bold text-muted">
            Non hai ancora allenatori: creane uno scrivendo il nome qui sopra.
          </p>
        ) : (
          <ul className="grid gap-4 lg:grid-cols-[repeat(auto-fill,minmax(360px,1fr))] lg:gap-5">
            {mine.map((t) => {
              const members = team.filter((p) => p.trainerId === t.id);
              // L'anteprima mostra solo la squadra; il box è solo contato (Fase 10).
              const squad = members.filter((p) => !p.inBox);
              const boxed = members.length - squad.length;
              return (
                <li key={t.id}>
                  <Link href={`/allenatori/${t.id}`} className="card flex gap-4 p-4">
                    <TrainerPortrait image={t.image} name={t.name} className="h-[108px] w-[88px]" />
                    <div className="flex min-w-0 flex-1 flex-col gap-2">
                      <span className="truncate font-display text-2xl font-semibold">{t.name}</span>
                      <span className="flex items-center gap-1.5 text-[15px]">
                        <RankLabel rank={t.rank} /> ·{" "}
                        {members.length === 0
                          ? "nessun Pokémon"
                          : `${squad.length} in squadra${boxed ? ` · ${boxed} nel box` : ""}`}
                      </span>
                      <span className={`tag self-start ${t.campaign ? "tag-info" : "tag-mut"}`}>
                        {t.campaign ? `Campagna ${t.campaign}` : "Nessuna campagna"}
                      </span>
                      {squad.length > 0 && (
                        <span className="flex flex-wrap gap-1.5">
                          {squad.map((p) => {
                            const s = species.get(p.speciesId);
                            return (
                              <span
                                key={p.id}
                                className="tint grid size-[34px] place-items-center overflow-hidden rounded-[10px] border-2 border-edge"
                                style={typeStyle(s?.types[0])}
                              >
                                <Sprite image={s?.image} name={s?.name ?? "?"} size={30} />
                              </span>
                            );
                          })}
                        </span>
                      )}
                    </div>
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
