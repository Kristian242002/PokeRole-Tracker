import "server-only";
import type { Ability, Item, Move, MoveLearners, Nature, Species } from "../../scripts/build-data";
import speciesJson from "@data/species.json";
import movesJson from "@data/moves.json";
import abilitiesJson from "@data/abilities.json";
import itemsJson from "@data/items.json";
import naturesJson from "@data/natures.json";
import moveLearnersJson from "@data/move-learners.json";

export type { Ability, Item, Move, MoveLearners, Nature, Species };

// Dati di gioco importati staticamente: restano nel bundle server (§14.8).
export const SPECIES = speciesJson as unknown as Species[];
export const MOVES = movesJson as unknown as Move[];
export const ABILITIES = abilitiesJson as unknown as Ability[];
export const ITEMS = itemsJson as unknown as Item[];
export const NATURES = naturesJson as unknown as Nature[];
export const MOVE_LEARNERS = moveLearnersJson as unknown as MoveLearners;

export const SPECIES_BY_ID = new Map(SPECIES.map((s) => [s.id, s]));
export const MOVES_BY_NAME = new Map(MOVES.map((m) => [m.name, m]));
export const ABILITIES_BY_NAME = new Map(ABILITIES.map((a) => [a.name, a]));
