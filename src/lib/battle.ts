/**
 * Ordine di iniziativa in battaglia (Fase 11). Modulo puro: usabile sia lato server sia lato client.
 * L'ordine dell'elenco è quello di gioco; i KO stanno in una zona a parte, in fondo.
 */

import type { BattleCombatant } from "@/db/schema";

export interface BattleState {
  combatants: BattleCombatant[];
}

export const MAX_COMBATANTS = 40;

/**
 * Ordina chi è in gioco dal più alto al più basso (senza iniziativa in fondo, i pari restano
 * nell'ordine attuale). I KO restano dopo, nel loro ordine.
 */
export function sortByInitiative(combatants: BattleCombatant[]): BattleCombatant[] {
  const active = combatants
    .filter((c) => !c.ko)
    .map((c, index) => ({ c, index }))
    .sort((a, b) => {
      const x = a.c.initiative ?? -Infinity;
      const y = b.c.initiative ?? -Infinity;
      return y === x ? a.index - b.index : y - x;
    })
    .map(({ c }) => c);
  return [...active, ...combatants.filter((c) => c.ko)];
}

/** KO: esce dall'ordine e va in fondo alla zona KO. Rientra: torna in fondo all'ordine. */
export function setKo(combatants: BattleCombatant[], key: string, ko: boolean): BattleCombatant[] {
  const target = combatants.find((c) => c.key === key);
  if (!target) return combatants;
  const others = combatants.filter((c) => c.key !== key);
  const moved = { ...target, ko };
  if (ko) return [...others, moved];
  const firstKo = others.findIndex((c) => c.ko);
  const at = firstKo === -1 ? others.length : firstKo;
  return [...others.slice(0, at), moved, ...others.slice(at)];
}

/** Base dell'iniziativa di un Pokémon: Dexterity + Alert (+3 dal rank Master, §6). */
export function initiativeBase(dexterity: number, alert: number, rankBonus: number): number {
  return dexterity + alert + rankBonus;
}
