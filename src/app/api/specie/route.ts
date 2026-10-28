import { NextResponse } from "next/server";
import { currentUser } from "@/auth";
import { dexEntries } from "@/lib/dex";

/** Pokédex ridotto (ufficiali + fanmade visibili), scaricato solo per "Aggiungi Pokémon". */
export async function GET() {
  const user = await currentUser();
  return NextResponse.json(await dexEntries(user?.id ?? null), {
    headers: { "Cache-Control": "private, max-age=60" },
  });
}
