import { NextResponse } from "next/server";
import { currentUser } from "@/auth";
import { MOVES } from "@/lib/data";
import { moveLearners } from "@/lib/species";

const BY_ID = new Map(MOVES.map((m) => [m.id, m]));

/** Dettagli di una mossa caricati all'apertura della riga: effetto, descrizione, chi la impara. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const move = BY_ID.get(id);
  if (!move) return NextResponse.json({ error: "Mossa non trovata" }, { status: 404 });
  const user = await currentUser();
  const learners = await moveLearners(move.name, user?.id ?? null);
  return NextResponse.json({ effect: move.effect, description: move.description, learners });
}
