import type { Metadata } from "next";
import { and, desc, eq, ne } from "drizzle-orm";
import { requireUser } from "@/auth";
import { db } from "@/db";
import { fanmadeSpecies, users } from "@/db/schema";
import { FanmadeList, type FanmadeListEntry } from "@/components/FanmadeList";
import type { FanmadeData } from "@/lib/fanmade";
import { FANMADE_PREFIX } from "@/lib/species";

export const metadata: Metadata = { title: "Fanmade" };

function entry(
  row: { id: string; name: string; shared: boolean; data: unknown },
  author?: string,
): FanmadeListEntry {
  const d = row.data as Partial<FanmadeData>;
  return {
    id: FANMADE_PREFIX + row.id,
    name: row.name,
    number: d.number ?? 0,
    types: d.types ?? [],
    image: d.image ?? "",
    shared: row.shared,
    author,
  };
}

/** Fanmade (§10.9): "Creati da te" e "Del gruppo". */
export default async function FanmadePage() {
  const user = await requireUser();
  const mine = await db
    .select()
    .from(fanmadeSpecies)
    .where(eq(fanmadeSpecies.ownerId, user.id))
    .orderBy(desc(fanmadeSpecies.createdAt));
  const group = await db
    .select({
      id: fanmadeSpecies.id,
      name: fanmadeSpecies.name,
      shared: fanmadeSpecies.shared,
      data: fanmadeSpecies.data,
      author: users.username,
    })
    .from(fanmadeSpecies)
    .innerJoin(users, eq(users.id, fanmadeSpecies.ownerId))
    .where(and(eq(fanmadeSpecies.shared, true), ne(fanmadeSpecies.ownerId, user.id)))
    .orderBy(desc(fanmadeSpecies.createdAt));

  return (
    <FanmadeList mine={mine.map((r) => entry(r))} group={group.map((r) => entry(r, r.author))} />
  );
}
