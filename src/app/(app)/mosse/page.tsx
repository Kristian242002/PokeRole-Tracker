import type { Metadata } from "next";
import { MovesBrowser } from "@/components/MovesBrowser";
import type { MoveSummary } from "@/components/MoveRow";
import { MOVES } from "@/lib/data";

export const metadata: Metadata = { title: "Mosse" };

// Al client solo i campi della riga compatta; effetto e "Chi la impara" si caricano all'apertura.
const SUMMARIES: MoveSummary[] = MOVES.map((m) => ({
  id: m.id,
  name: m.name,
  type: m.type,
  category: m.category,
  power: m.power,
  accuracy: m.accuracy,
  damage: m.damage,
  target: m.target,
}));

export default function MossePage() {
  return <MovesBrowser moves={SUMMARIES} />;
}
