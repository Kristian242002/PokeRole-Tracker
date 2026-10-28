import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireUser } from "@/auth";
import { BiomesBrowser, type BiomeSummary } from "@/components/BiomesBrowser";
import { DetailHeader } from "@/components/PageHeader";
import { masterCampaign } from "@/lib/access";
import { BIOMES, BIOME_CODES, RARITIES, type Rarity } from "@/lib/biomes";
import { biomeCorrections, campaignTables } from "@/lib/campaign-biomes";

type Params = { params: Promise<{ id: string }> };

export const metadata: Metadata = { title: "Biomi" };

/** Biomi della campagna (§11.6): solo il master. */
export default async function BiomesPage({ params }: Params) {
  const { id } = await params;
  const user = await requireUser();
  const campaign = await masterCampaign(id, user.id);
  if (!campaign) notFound();

  const { tables } = await campaignTables(campaign.id, user.id, BIOME_CODES);
  const corrections = await biomeCorrections(campaign.id);
  // Solo i riepiloghi: le specie di un bioma si caricano quando il master lo apre.
  const biomes: BiomeSummary[] = BIOMES.map((b) => {
    const entries = tables.get(b.code)!;
    return {
      code: b.code,
      name: b.name,
      types: b.types,
      corrections: corrections.filter((c) => c.biome === b.code).length,
      counts: Object.fromEntries(
        RARITIES.map((r) => [r, entries.filter((e) => e.rarity === r).length]),
      ) as Record<Rarity, number>,
      total: entries.length,
    };
  });

  return (
    <>
      <DetailHeader
        eyebrow="Master"
        title="Biomi"
        back={{
          href: `/campagne/${campaign.id}`,
          label: "Torna alla campagna",
          section: campaign.name,
        }}
      />
      <main className="flex flex-col gap-4 p-4 pb-8 lg:px-8 lg:pt-4 lg:pb-10">
        <div className="flex flex-col gap-1">
          <h1 className="h1 hidden lg:block">Biomi</h1>
          <p className="m-0 text-[15px] text-muted">
            Quali specie appaiono nel generatore e quanto spesso: comune 60%, non comune 30%, raro
            10%. Le modifiche valgono solo per questa campagna.
          </p>
        </div>
        <BiomesBrowser campaignId={campaign.id} biomes={biomes} />
      </main>
    </>
  );
}
