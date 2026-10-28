import type { Metadata } from "next";
import { MovesBrowser } from "@/components/MovesBrowser";
import { MOVE_SUMMARIES } from "@/lib/move-summaries";

export const metadata: Metadata = { title: "Mosse" };

// Al client solo i campi della riga compatta; effetto e "Chi la impara" si caricano all'apertura.
export default function MossePage() {
  return <MovesBrowser moves={MOVE_SUMMARIES} />;
}
