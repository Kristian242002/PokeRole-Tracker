import "server-only";
import { ABILITIES, MOVES, SPECIES } from "./data";
import { visibleFanmade } from "./species";

const ABILITY_NAMES = ABILITIES.map((a) => a.name).sort((a, b) => a.localeCompare(b));
const MOVE_CATALOG = MOVES.map((m) => ({ name: m.name, type: m.type })).sort((a, b) =>
  a.name.localeCompare(b.name),
);
const OFFICIAL_SPECIES = SPECIES.map((s) => ({ name: s.name, fanmade: false }));

/** Dati per i suggerimenti dell'editor fanmade (solo nomi, niente JSON completi al client). */
export async function fanmadeEditorData(userId: string, selfId?: string) {
  const fanmade = (await visibleFanmade(userId))
    .filter((s) => s.id !== selfId)
    .map((s) => ({ name: s.name, fanmade: true }));
  return {
    abilities: ABILITY_NAMES,
    moves: MOVE_CATALOG,
    species: [...fanmade, ...OFFICIAL_SPECIES],
  };
}
