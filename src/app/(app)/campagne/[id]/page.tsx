import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { and, asc, eq, inArray, isNull } from "drizzle-orm";
import { requireUser } from "@/auth";
import { db } from "@/db";
import { pokemon, trainers, users } from "@/db/schema";
import {
  CampaignCode,
  CampaignInfo,
  DeleteCampaignButton,
  RemovePlayerButton,
  SendToButton,
} from "@/components/CampaignControls";
import { CreateTrainerForm } from "@/components/CreateTrainerForm";
import { DetailHeader } from "@/components/PageHeader";
import { RankLabel } from "@/components/RankIcon";
import { Sprite } from "@/components/Sprite";
import { typeStyle } from "@/components/TypeBadge";
import { createNpcTrainer } from "@/lib/actions/campaigns";
import { masterCampaign } from "@/lib/access";
import { maxHp, shownCurrent } from "@/lib/rules";
import { speciesSummaries } from "@/lib/species";

type Params = { params: Promise<{ id: string }> };

export const metadata: Metadata = { title: "Campagna" };

/** Dettaglio campagna (§10.11): solo il master; per gli altri 404. */
export default async function CampaignPage({ params }: Params) {
  const { id } = await params;
  const user = await requireUser();
  const campaign = await masterCampaign(id, user.id);
  if (!campaign) notFound();

  const npcs = await db
    .select({ id: trainers.id, name: trainers.name, rank: trainers.rank })
    .from(trainers)
    .where(eq(trainers.npcCampaignId, campaign.id))
    .orderBy(asc(trainers.createdAt));
  const players = await db
    .select({ id: trainers.id, name: trainers.name, rank: trainers.rank, user: users.username })
    .from(trainers)
    .innerJoin(users, eq(users.id, trainers.userId))
    .where(and(eq(trainers.campaignId, campaign.id), isNull(trainers.npcCampaignId)))
    .orderBy(asc(users.username), asc(trainers.name));

  const trainerIds = [...npcs, ...players].map((t) => t.id);
  const team = trainerIds.length
    ? await db
        .select()
        .from(pokemon)
        .where(inArray(pokemon.trainerId, trainerIds))
        .orderBy(asc(pokemon.createdAt))
    : [];
  const species = await speciesSummaries(team.map((p) => p.speciesId));
  const members = (trainerId: string) =>
    team
      .filter((p) => p.trainerId === trainerId)
      .map((p) => {
        const s = species.get(p.speciesId);
        const hpMax = maxHp("pokemon", p.attributes.vitality, s?.baseHP ?? 0, p.rank);
        return {
          id: p.id,
          name: p.nickname || s?.name || p.speciesId,
          species: s?.name ?? p.speciesId,
          image: p.image ?? s?.image ?? "",
          type: s?.types[0],
          rank: p.rank,
          hp: shownCurrent(p.currentHp, hpMax),
          hpMax,
        };
      });
  const targets = players.map((t) => ({ id: t.id, name: t.name, user: t.user }));

  return (
    <>
      <DetailHeader
        eyebrow="Campagna · master"
        title={campaign.name}
        back={{ href: "/campagne", label: "Torna alle campagne", section: "Le mie campagne" }}
      />
      <main className="flex flex-col gap-4 p-4 pb-8 lg:gap-5 lg:px-8 lg:pt-4 lg:pb-10">
        <h1 className="h1 hidden lg:block">{campaign.name}</h1>
        <div className="flex flex-col gap-4 lg:flex-row lg:flex-wrap lg:gap-5">
          <CampaignCode campaignId={campaign.id} code={campaign.joinCode} />
          <div
            className="grid grid-cols-2 gap-3 lg:flex-[1_1_320px]"
            aria-label="Strumenti del master"
          >
            {(
              [
                ["Generatore", "Pokémon selvatici", "#ffe1e5"],
                ["Biomi", "Specie e rarità", "#ddeedf"],
              ] as const
            ).map(([title, hint, bg]) => (
              <div
                key={title}
                className="card flex flex-col gap-1 p-4 text-[#1b2440]"
                style={{ background: bg }}
              >
                <span className="font-display text-xl font-semibold">{title}</span>
                <span className="text-[13px] font-bold">{hint}</span>
                <span className="tag tag-mut mt-1 self-start">In arrivo (fase 5)</span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-4 lg:flex-row lg:flex-wrap lg:items-start lg:gap-5">
          {/* ALLENATORI DEL MASTER */}
          <section className="panel gap-3 lg:flex-[3_1_520px]" aria-labelledby="npc-title">
            <div className="flex flex-col gap-0.5">
              <h2 id="npc-title" className="h2">
                I tuoi allenatori
              </h2>
              <span className="text-sm text-muted">Li vedi solo tu.</span>
            </div>
            <CreateTrainerForm
              action={createNpcTrainer.bind(null, campaign.id)}
              label="Nuovo allenatore della campagna"
            />
            {npcs.length === 0 && (
              <p className="m-0 text-muted">
                Nessun allenatore: crea capipalestra, rivali o reclute qui sopra.
              </p>
            )}
            {npcs.map((t) => (
              <div key={t.id} className="flex flex-col gap-2 border-t-2 border-line pt-3">
                <Link
                  href={`/allenatori/${t.id}`}
                  className="flex items-center gap-2.5 text-ink no-underline hover:text-ink"
                >
                  <span className="font-display text-lg font-semibold">{t.name}</span>
                  <RankLabel rank={t.rank} size={20} />
                  <span className="tag tag-info ml-auto">Scheda completa</span>
                </Link>
                {members(t.id).length === 0 && (
                  <span className="text-sm text-muted">Nessun Pokémon.</span>
                )}
                <ul className="flex flex-col gap-2">
                  {members(t.id).map((p) => (
                    <li
                      key={p.id}
                      className="flex flex-wrap items-center gap-2.5 rounded-[14px] border-2 border-edge bg-surface2 p-2.5"
                    >
                      <span
                        className="tint grid size-11 flex-none place-items-center rounded-xl border-2 border-edge"
                        style={typeStyle(p.type)}
                      >
                        <Sprite image={p.image} name={p.species} size={38} />
                      </span>
                      <Link
                        href={`/pokemon/${p.id}`}
                        className="flex min-w-0 flex-1 flex-col text-ink no-underline hover:text-ink"
                      >
                        <span className="truncate font-extrabold">{p.name}</span>
                        <span className="truncate text-[13px] font-bold text-muted">
                          {p.species} · {p.rank} · HP {p.hp}/{p.hpMax}
                        </span>
                      </Link>
                      <SendToButton pokemonId={p.id} pokemonName={p.name} players={targets} />
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </section>

          {/* GIOCATORI COLLEGATI */}
          <section className="panel gap-3 lg:flex-[2_1_360px]" aria-labelledby="players-title">
            <h2 id="players-title" className="h2">
              Giocatori collegati
            </h2>
            {players.length === 0 && (
              <p className="m-0 text-muted">
                Nessun giocatore: dai il codice qui sopra ai giocatori, che lo scrivono nella scheda
                del loro allenatore.
              </p>
            )}
            {players.map((t) => (
              <div
                key={t.id}
                className="flex flex-col gap-2 rounded-[14px] border-2 border-edge bg-surface2 p-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="flex flex-col">
                    <span className="font-extrabold">{t.name}</span>
                    <span className="text-[13px] font-bold text-muted">
                      @{t.user} · {t.rank}
                    </span>
                  </span>
                  <span className="tag tag-mut">Sola lettura</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {members(t.id).map((p) => (
                    <Link
                      key={p.id}
                      href={`/pokemon/${p.id}`}
                      className="inline-flex h-9 items-center gap-1.5 rounded-full border-2 border-edge bg-surface pr-2.5 pl-1 text-[13px] font-extrabold text-ink no-underline hover:text-ink"
                    >
                      <span
                        className="tint grid size-7 place-items-center overflow-hidden rounded-full"
                        style={typeStyle(p.type)}
                      >
                        <Sprite image={p.image} name={p.species} size={26} />
                      </span>
                      {p.name} · HP {p.hp}/{p.hpMax}
                    </Link>
                  ))}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Link href={`/allenatori/${t.id}`} className="text-sm font-extrabold">
                    Vedi scheda di {t.name}
                  </Link>
                  <span className="ml-auto">
                    <RemovePlayerButton
                      campaignId={campaign.id}
                      trainerId={t.id}
                      trainerName={t.name}
                    />
                  </span>
                </div>
              </div>
            ))}
          </section>
        </div>

        <CampaignInfo
          campaignId={campaign.id}
          name={campaign.name}
          description={campaign.description}
        />
        <DeleteCampaignButton campaignId={campaign.id} name={campaign.name} />
      </main>
    </>
  );
}
