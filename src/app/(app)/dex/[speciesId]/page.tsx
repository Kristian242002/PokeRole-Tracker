import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { currentUser } from "@/auth";
import { AbilityInfo } from "@/components/AbilityInfo";
import { AttributeDots } from "@/components/AttributeDots";
import { MoveRow, type MoveSummary } from "@/components/MoveRow";
import { DetailHeader } from "@/components/PageHeader";
import { RankIcon, RankLabel } from "@/components/RankIcon";
import { Sprite } from "@/components/Sprite";
import { TypeBadges, typeStyle } from "@/components/TypeBadge";
import { ABILITIES_BY_NAME, findMove } from "@/lib/data";
import type { Evolution } from "@/lib/data-types";
import { RANKS } from "@/lib/rules";
import { getSpecies, speciesIdByName, visibleFanmade, type ResolvedSpecies } from "@/lib/species";

type Params = { params: Promise<{ speciesId: string }> };

async function load(speciesId: string) {
  const user = await currentUser();
  const species = await getSpecies(decodeURIComponent(speciesId), user?.id ?? null);
  return { user, species };
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { speciesId } = await params;
  const { species } = await load(speciesId);
  return { title: species?.name ?? "Specie non trovata" };
}

const ATTRIBUTE_NAMES = [
  ["strength", "Strength"],
  ["dexterity", "Dexterity"],
  ["vitality", "Vitality"],
  ["special", "Special"],
  ["insight", "Insight"],
] as const;

const KIND_LABEL: Record<string, string> = {
  Level: "Livello",
  Stone: "Pietra",
  Item: "Strumento",
  Trade: "Scambio",
  Special: "Speciale",
  Mega: "Mega",
  Form: "Forma",
  Stat: "Attributo",
};

const SPEED_LABEL: Record<string, string> = {
  Fast: "veloce",
  Medium: "media",
  Slow: "lenta",
  Unknown: "sconosciuta",
};

function evolutionMethod(e: Evolution): string {
  const parts = [KIND_LABEL[e.kind] ?? e.kind];
  if (e.speed) parts.push(`velocità ${SPEED_LABEL[e.speed] ?? e.speed}`);
  if (e.item) parts.push(e.item);
  return parts.join(" · ");
}

function genderLabel(genderType: string): string {
  switch (genderType) {
    case "N":
      return "Senza genere";
    case "M":
      return "Solo ♂";
    case "F":
      return "Solo ♀";
    default:
      return "♂ o ♀";
  }
}

const formatNumber = (n: number, unit: string) =>
  n ? `${n.toLocaleString("it-IT", { maximumFractionDigits: 1 })} ${unit}` : "—";

export default async function SpeciesPage({ params }: Params) {
  const { speciesId } = await params;
  const { user, species } = await load(speciesId);
  if (!species) notFound();

  const number =
    species.fanmade && !species.number ? "Fanmade" : `#${String(species.number).padStart(4, "0")}`;
  const fanmade = species.fanmade ? await visibleFanmade(user?.id ?? null) : [];

  return (
    <>
      <DetailHeader
        eyebrow="Scheda specie"
        title={`${number} · ${species.name}`}
        back={{ href: "/dex", label: "Torna al Pokédex", section: "Pokédex" }}
      />
      <main className="flex flex-col gap-4 p-4 pb-6 lg:flex-row lg:flex-wrap lg:items-start lg:gap-5 lg:px-8 lg:pt-4 lg:pb-10">
        <div className="flex flex-col gap-4 lg:max-w-[440px] lg:flex-[1_1_340px] lg:gap-5">
          <SpeciesCard species={species} number={number} />
          <EvolutionsCard species={species} fanmade={fanmade} />
        </div>
        <div className="flex min-w-0 flex-col gap-4 lg:flex-[2_1_520px] lg:gap-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:flex-wrap lg:gap-5">
            <section className="panel gap-1 lg:flex-[1_1_340px]">
              <h2 className="h2 mb-1.5">Attributi base e massimi</h2>
              {ATTRIBUTE_NAMES.map(([key, label]) => {
                const [base, max] = species.attributes[key];
                return (
                  <div key={key} className="flex min-h-[38px] items-center gap-2">
                    <span className="w-[86px] flex-none text-[15px] font-extrabold">{label}</span>
                    <AttributeDots base={base} max={max} label={label} />
                    <span className="w-10 text-right text-[13px] font-extrabold text-muted">
                      {base} / {max}
                    </span>
                  </div>
                );
              })}
              <div className="flex gap-3.5 border-t-2 border-line pt-2 text-[13px] font-bold text-muted">
                <span className="inline-flex items-center gap-1.5">
                  <span className="pd pd-f" />
                  Base
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="pd pd-e" />
                  Fino al massimo
                </span>
              </div>
            </section>
            <AbilitiesCard species={species} />
          </div>
          <MovesCard species={species} />
        </div>
      </main>
    </>
  );
}

function SpeciesCard({ species, number }: { species: ResolvedSpecies; number: string }) {
  return (
    <section className="panel gap-0 overflow-hidden p-0">
      <div
        className="tint relative grid h-[170px] place-items-center border-b-2 border-edge lg:h-[220px]"
        style={typeStyle(species.types[0])}
      >
        <Sprite
          key={species.image}
          image={species.image}
          name={species.name}
          size={200}
          fluid
          className="size-[150px] lg:size-[200px]"
        />
        {species.fanmade && <span className="fan-badge absolute top-2.5 left-2.5">Fanmade</span>}
      </div>
      <div className="flex flex-col gap-2 p-4 lg:p-[18px]">
        <span className="text-sm font-extrabold text-muted">
          {number}
          {species.category && ` · ${species.category}`}
        </span>
        <h1 className="m-0 font-display text-[34px] leading-none font-semibold lg:text-[40px]">
          {species.name}
        </h1>
        <div className="flex flex-wrap items-center gap-1.5">
          <TypeBadges types={species.types} />
          {species.legendary && <span className="tag tag-info">Leggendario</span>}
        </div>
        {species.description && (
          <p className="mt-1 text-[15px] leading-normal">{species.description}</p>
        )}
        <dl className="grid grid-cols-3 gap-2 pt-1.5">
          <div className="stat-box">
            <dt className="label-sm">HP base</dt>
            <dd className="stat-value text-2xl">{species.baseHP}</dd>
          </div>
          <div className="stat-box">
            <dt className="label-sm">Altezza</dt>
            <dd className="stat-value">{formatNumber(species.heightM, "m")}</dd>
          </div>
          <div className="stat-box">
            <dt className="label-sm">Peso</dt>
            <dd className="stat-value">{formatNumber(species.weightKg, "kg")}</dd>
          </div>
          <div className="stat-box col-span-2">
            <dt className="label-sm">Rank consigliato</dt>
            <dd className="pt-1">
              <RankLabel rank={species.recommendedRank} />
            </dd>
          </div>
          <div className="stat-box">
            <dt className="label-sm">Genere</dt>
            <dd className="pt-1 font-extrabold">{genderLabel(species.genderType)}</dd>
          </div>
        </dl>
      </div>
    </section>
  );
}

function AbilitiesCard({ species }: { species: ResolvedSpecies }) {
  const custom = new Map(species.customAbilities.map((a) => [a.name, a.effect]));
  const effectOf = (name: string) =>
    custom.get(name) ?? ABILITIES_BY_NAME.get(name)?.effect ?? null;
  const event = species.eventAbilities
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return (
    <section className="panel lg:flex-[1_1_300px]">
      <h2 className="h2">Abilità</h2>
      {species.abilities.map((a) => (
        <AbilityInfo key={a} name={a} effect={effectOf(a)} />
      ))}
      {species.hiddenAbility && (
        <AbilityInfo
          name={species.hiddenAbility}
          effect={effectOf(species.hiddenAbility)}
          tag="Nascosta"
        />
      )}
      {event.map((a) => (
        <AbilityInfo key={a} name={a} effect={effectOf(a)} tag="Evento" />
      ))}
      {species.abilities.length === 0 && !species.hiddenAbility && (
        <p className="text-muted">Nessuna abilità.</p>
      )}
    </section>
  );
}

function EvolutionsCard({
  species,
  fanmade,
}: {
  species: ResolvedSpecies;
  fanmade: ResolvedSpecies[];
}) {
  const idByName = speciesIdByName(fanmade);
  const evolutions = species.evolutions.filter((e) => e.from || e.to);
  return (
    <section className="panel">
      <h2 className="h2">Evoluzioni</h2>
      {evolutions.length === 0 ? (
        <p className="text-muted">Questa specie non si evolve.</p>
      ) : (
        <ul className="flex flex-col gap-2.5">
          {evolutions.map((e, i) => {
            const other = (e.to ?? e.from)!;
            const otherId = (e.to ? e.toId : e.fromId) ?? idByName.get(other.toLowerCase());
            const current = <EvoNode name={species.name} current />;
            const target = <EvoNode name={other} href={otherId ? `/dex/${otherId}` : undefined} />;
            return (
              <li key={i} className="flex items-center gap-2">
                {e.to ? current : target}
                <span className="flex max-w-[45%] flex-col items-center gap-0.5 text-center text-xs font-extrabold text-muted">
                  <svg
                    width="26"
                    height="26"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                    className="text-ink"
                  >
                    <path d="M5 12h14M13 6l6 6-6 6" />
                  </svg>
                  <span className="sr-only">si evolve in</span>
                  {evolutionMethod(e)}
                </span>
                {e.to ? target : current}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function EvoNode({ name, href, current }: { name: string; href?: string; current?: boolean }) {
  const className = `flex flex-1 flex-col items-center gap-1.5 rounded-[14px] border-edge p-2.5 text-center font-extrabold text-ink no-underline ${
    current ? "border-[3px] bg-warn-bg" : "border-2 bg-surface"
  }`;
  if (!href || current) return <div className={className}>{name}</div>;
  return (
    <Link href={href} className={`${className} hover:text-ink`}>
      {name}
    </Link>
  );
}

function MovesCard({ species }: { species: ResolvedSpecies }) {
  const groups = new Map<string, { name: string; move?: MoveSummary }[]>();
  for (const { rank, name } of species.moves) {
    const m = findMove(name);
    const list = groups.get(rank) ?? [];
    list.push({
      name,
      move: m && {
        id: m.id,
        name: m.name,
        type: m.type,
        category: m.category,
        power: m.power,
        accuracy: m.accuracy,
        damage: m.damage,
        target: m.target,
        effect: m.effect,
        description: m.description,
      },
    });
    groups.set(rank, list);
  }
  const order = [
    ...RANKS,
    ...[...groups.keys()].filter((r) => !(RANKS as readonly string[]).includes(r)),
  ];
  return (
    <section className="panel">
      <h2 className="h2">Mosse per rank</h2>
      {groups.size === 0 && <p className="text-muted">Nessuna mossa.</p>}
      {order
        .filter((r) => groups.has(r))
        .map((rank) => (
          <div key={rank} className="flex flex-col gap-2">
            <h3 className="m-0 flex items-center gap-2 pt-1.5 font-display text-[17px] font-semibold">
              <RankIcon rank={rank} />
              {rank}
            </h3>
            {groups.get(rank)!.map(({ name, move }, i) =>
              move ? (
                <MoveRow key={`${name}-${i}`} move={move} />
              ) : (
                <div key={`${name}-${i}`} className="xrow bg-surface2 px-3 py-3 font-extrabold">
                  {name} <span className="font-bold text-muted">· dettagli non disponibili</span>
                </div>
              ),
            )}
          </div>
        ))}
    </section>
  );
}
