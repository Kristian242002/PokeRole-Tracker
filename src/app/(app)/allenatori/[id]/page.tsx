import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { requireUser } from "@/auth";
import { db } from "@/db";
import { pokemon } from "@/db/schema";
import { TrainerSheet, type TeamMember, type TrainerSheetData } from "@/components/TrainerSheet";
import { trainerAccess } from "@/lib/access";
import { dexEntries } from "@/lib/dex";
import { maxHp, shownCurrent } from "@/lib/rules";
import { sheetContext } from "@/lib/sheet-context";
import { speciesSummaries } from "@/lib/species";

type Params = { params: Promise<{ id: string }> };

export const metadata: Metadata = { title: "Scheda allenatore" };

export default async function TrainerPage({ params }: Params) {
  const { id } = await params;
  const user = await requireUser();
  const access = await trainerAccess(id, user.id);
  if (!access) notFound();
  const { trainer, mode } = access;
  const readOnly = mode !== "owner";
  const { campaign, back } = await sheetContext(trainer, mode, "trainers");

  const rows = await db
    .select()
    .from(pokemon)
    .where(eq(pokemon.trainerId, trainer.id))
    .orderBy(asc(pokemon.createdAt));
  const species = await speciesSummaries(rows.map((p) => p.speciesId));
  const team: TeamMember[] = rows.map((p) => {
    const s = species.get(p.speciesId);
    const hpMax = maxHp("pokemon", p.attributes.vitality, s?.baseHP ?? 0, p.rank);
    return {
      id: p.id,
      name: p.nickname || s?.name || p.speciesId,
      species: s?.name ?? p.speciesId,
      image: p.image ?? s?.image ?? "",
      type: s?.types[0] ?? "Normal",
      rank: p.rank,
      hp: shownCurrent(p.currentHp, hpMax),
      hpMax,
    };
  });

  return (
    <TrainerSheet
      trainer={{
        id: trainer.id,
        name: trainer.name,
        age: trainer.age,
        rank: trainer.rank as TrainerSheetData["rank"],
        money: trainer.money,
        image: trainer.image,
        attributes: trainer.attributes,
        social: trainer.social,
        skills: trainer.skills,
        currentHp: trainer.currentHp,
        currentWill: trainer.currentWill,
        statuses: trainer.statuses,
        backpack: trainer.backpack,
        notes: trainer.notes,
        locked: trainer.locked,
      }}
      team={team}
      dex={readOnly ? [] : await dexEntries(user.id)}
      readOnly={readOnly}
      campaign={campaign}
      back={back}
    />
  );
}
