// Etichette italiane per evoluzioni e genere, condivise da scheda specie e scheda Pokémon.
import type { Evolution } from "./data-types";

export const KIND_LABEL: Record<string, string> = {
  Level: "Livello",
  Stone: "Pietra",
  Item: "Strumento",
  Trade: "Scambio",
  Special: "Speciale",
  Mega: "Mega",
  Form: "Forma",
  Stat: "Attributo",
};

export const SPEED_LABEL: Record<string, string> = {
  Fast: "veloce",
  Medium: "media",
  Slow: "lenta",
  Unknown: "sconosciuta",
};

export function evolutionMethod(e: Evolution): string {
  const parts = [KIND_LABEL[e.kind] ?? e.kind];
  if (e.speed) parts.push(`velocità ${SPEED_LABEL[e.speed] ?? e.speed}`);
  if (e.item) parts.push(e.item);
  return parts.join(" · ");
}

export function genderLabel(genderType: string): string {
  switch (genderType) {
    case "N":
      return "Senza genere";
    case "M":
      return "Solo ♂";
    case "F":
      return "Solo ♀";
    default:
      return "♂ o ♀";
  }
}

export const formatNumber = (n: number, unit: string) =>
  n ? `${n.toLocaleString("it-IT", { maximumFractionDigits: 1 })} ${unit}` : "—";
