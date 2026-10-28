import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { and, asc, eq, isNull } from "drizzle-orm";
import { requireUser } from "@/auth";
import { db } from "@/db";
import { trainers } from "@/db/schema";
import type { MoveSummary } from "@/components/MoveRow";
import { PokemonSheet, type SheetSpecies } from "@/components/PokemonSheet";
import { pokemonAccess } from "@/lib/access";
import { ABILITIES_BY_NAME, MOVES, NATURES, findMove } from "@/lib/data";
import { evolutionMethod } from "@/lib/labels";
import { sheetContext } from "@/lib/sheet-context";
import { getSpecies, speciesIdByName, visibleFanmade } from "@/lib/species";

type Params = { params: Promise<{ id: string }> };

export const metadata: Metadata = { title: "Scheda Pokémon" };

const NATURE_OPTIONS = NATURES.map((n) => ({ name: n.name, confidence: n.confidence }));

export default async function PokemonPage({ params }: Params) {
  const { id } = await params;
  const user = await requireUser();
  const access = await pokemonAccess(id, user.id);
  if (!access) notFound();
  const { pokemon: p, trainer, mode } = access;
  const readOnly = mode !== "owner";

  // Specie risolta senza controllo di visibilità: il Pokémon è già posseduto (§14.11).
  const species = await getSpecies(p.speciesId, user.id, { skipVisibility: true });
  if (!species) notFound();

  const idByName = speciesIdByName(
    species.evolutions.some((e) => e.to && !e.toId) ? await visibleFanmade(user.id) : [],
  );
  const evolutions = species.evolutions
    .filter((e) => e.to)
    .map((e) => ({
      toId: e.toId ?? idByName.get(e.to!.toLowerCase()) ?? "",
      name: e.to!,
      method: evolutionMethod(e),
    }))
    .filter((e) => e.toId);

  const sheetSpecies: SheetSpecies = {
    id: species.id,
    name: species.name,
    types: species.types,
    baseHP: species.baseHP,
    attributes: species.attributes,
    abilities: species.abilities,
    hiddenAbility: species.hiddenAbility,
    eventAbilities: species.eventAbilities
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
    genderType: species.genderType,
    heightM: species.heightM,
    weightKg: species.weightKg,
    image: species.image,
    moves: species.moves,
    evolutions,
  };

  const custom = new Map(species.customAbilities.map((a) => [a.name, a.effect]));
  const abilityNames = [
    ...sheetSpecies.abilities,
    ...(sheetSpecies.hiddenAbility ? [sheetSpecies.hiddenAbility] : []),
    ...sheetSpecies.eventAbilities,
    p.ability,
  ].filter(Boolean);
  const abilityEffects = Object.fromEntries(
    abilityNames.map((a) => [a, custom.get(a) ?? ABILITIES_BY_NAME.get(a)?.effect ?? ""]),
  );

  // Tutte le mosse per "Aggiungi mossa"; effetto e descrizione solo per quelle già note.
  const known = new Set(p.moves.map((m) => findMove(m)?.name).filter(Boolean));
  const moves: MoveSummary[] = MOVES.map((m) => ({
    id: m.id,
    name: m.name,
    type: m.type,
    category: m.category,
    power: m.power,
    accuracy: m.accuracy,
    damage: m.damage,
    target: m.target,
    ...(known.has(m.name) ? { effect: m.effect, description: m.description } : {}),
  }));

  // Si sposta solo tra gli allenatori dello stesso gruppo: propri, oppure NPC della stessa campagna.
  const siblings = await db
    .select({ id: trainers.id, name: trainers.name, rank: trainers.rank })
    .from(trainers)
    .where(
      and(
        eq(trainers.userId, trainer.userId),
        trainer.npcCampaignId
          ? eq(trainers.npcCampaignId, trainer.npcCampaignId)
          : isNull(trainers.npcCampaignId),
      ),
    )
    .orderBy(asc(trainers.createdAt));

  return (
    <PokemonSheet
      pokemon={p}
      species={sheetSpecies}
      abilityEffects={abilityEffects}
      natures={NATURE_OPTIONS}
      trainers={readOnly ? [{ id: trainer.id, name: trainer.name, rank: trainer.rank }] : siblings}
      moves={moves}
      readOnly={readOnly}
      back={(await sheetContext(trainer, mode, "pokemon")).back}
    />
  );
}
