import "server-only";
import type { MoveSummary } from "@/components/MoveRow";
import { MOVES } from "./data";

/** Campi della riga compatta di una mossa: effetto e descrizione si caricano all'apertura. */
export function moveSummary(m: (typeof MOVES)[number]): MoveSummary {
  return {
    id: m.id,
    name: m.name,
    type: m.type,
    category: m.category,
    power: m.power,
    accuracy: m.accuracy,
    damage: m.damage,
    target: m.target,
  };
}

export const MOVE_SUMMARIES: MoveSummary[] = MOVES.map(moveSummary);
