import { NextResponse } from "next/server";
import { MOVE_SUMMARIES } from "@/lib/move-summaries";

export const dynamic = "force-static";

/** Elenco compatto delle mosse, scaricato dalla scheda Pokémon solo per "Aggiungi mossa". */
export function GET() {
  return NextResponse.json(MOVE_SUMMARIES);
}
