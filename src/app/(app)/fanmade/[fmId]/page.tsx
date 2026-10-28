import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { requireUser } from "@/auth";
import { db } from "@/db";
import { fanmadeSpecies } from "@/db/schema";
import { FanmadeEditor } from "@/components/FanmadeEditor";
import { isUuid } from "@/lib/access";
import { fanmadeToInput, type FanmadeData } from "@/lib/fanmade";
import { fanmadeEditorData } from "@/lib/fanmade-editor";
import { FANMADE_PREFIX, isFanmadeId } from "@/lib/species";

export const metadata: Metadata = { title: "Modifica fanmade" };

type Params = { params: Promise<{ fmId: string }> };

/** Editor di un proprio fanmade: gli altri ricevono 404 (§8). */
export default async function EditFanmadePage({ params }: Params) {
  const { fmId } = await params;
  const user = await requireUser();
  const speciesId = decodeURIComponent(fmId);
  const uuid = speciesId.slice(FANMADE_PREFIX.length);
  if (!isFanmadeId(speciesId) || !isUuid(uuid)) notFound();

  const [row] = await db
    .select()
    .from(fanmadeSpecies)
    .where(and(eq(fanmadeSpecies.id, uuid), eq(fanmadeSpecies.ownerId, user.id)))
    .limit(1);
  if (!row) notFound();

  const data = await fanmadeEditorData(user.id, speciesId);
  return (
    <FanmadeEditor
      speciesId={speciesId}
      initial={fanmadeToInput(row.name, row.shared, row.data as Partial<FanmadeData>)}
      userId={user.id}
      {...data}
    />
  );
}
