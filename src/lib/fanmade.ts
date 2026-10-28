/**
 * Fanmade (§10.9): forma dell'editor, validazione zod e conversione nel formato di species.json.
 * Modulo puro (niente DB né JSON di gioco): i controlli che servono i dati arrivano da `FanmadeContext`.
 */
import { z } from "zod";
import type { Evolution, Species } from "./data-types";
import { POKEMON_ATTRIBUTES, RANKS, TYPES, type PokemonAttribute } from "./rules";

export const EVOLUTION_KINDS = [
  "Level",
  "Stone",
  "Item",
  "Trade",
  "Special",
  "Stat",
  "Form",
  "Mega",
] as const;
export const EVOLUTION_SPEEDS = ["", "Fast", "Medium", "Slow"] as const;
export const GENDER_TYPES = ["", "M", "F", "N"] as const;

const score = z
  .number("Valore non valido")
  .int("Valore non valido")
  .min(0, "Gli attributi vanno da 0 a 10")
  .max(10, "Gli attributi vanno da 0 a 10");

const optionalNumber = (label: string, max: number) =>
  z
    .number(`${label}: numero non valido`)
    .min(0, `${label}: numero non valido`)
    .max(max, `${label}: massimo ${max}`)
    .nullable();

const ability = z.object({
  name: z.string().trim().max(60, "Abilità: massimo 60 caratteri"),
  effect: z.string().trim().max(2000, "Effetto dell'abilità: massimo 2000 caratteri"),
});

export const fanmadeInputSchema = z
  .object({
    name: z.string().trim().min(1, "Il nome è obbligatorio").max(40, "Nome: massimo 40 caratteri"),
    types: z
      .array(z.enum(TYPES, "Tipo non valido"))
      .min(1, "Scegli almeno il tipo 1")
      .max(2, "Al massimo due tipi"),
    category: z.string().trim().max(60, "Categoria: massimo 60 caratteri"),
    number: z
      .number("Numero non valido")
      .int("Il numero deve essere intero")
      .min(1, "Il numero deve essere almeno 1")
      .max(99999, "Numero: massimo 99999")
      .nullable(),
    image: z
      .string()
      .trim()
      .max(500, "Link dell'immagine troppo lungo")
      .refine(
        (s) => s === "" || /^https:\/\/[^\s]+$/.test(s),
        "L'immagine deve essere un link https",
      ),
    description: z.string().trim().max(2000, "Descrizione: massimo 2000 caratteri"),
    baseHP: z
      .number("HP base non validi")
      .int("HP base non validi")
      .min(1, "Gli HP base vanno da 1 a 20")
      .max(20, "Gli HP base vanno da 1 a 20"),
    recommendedRank: z.enum(RANKS, "Rank consigliato non valido"),
    legendary: z.boolean(),
    genderType: z.enum(GENDER_TYPES, "Genere non valido"),
    heightM: optionalNumber("Altezza", 1000),
    weightKg: optionalNumber("Peso", 10000),
    attributes: z.object(
      Object.fromEntries(POKEMON_ATTRIBUTES.map((a) => [a, z.tuple([score, score])])) as Record<
        PokemonAttribute,
        z.ZodTuple<[typeof score, typeof score]>
      >,
    ),
    abilities: z.array(ability).max(2),
    hiddenAbility: ability,
    moves: z
      .array(
        z.object({
          rank: z.enum(RANKS, "Rank della mossa non valido"),
          name: z.string().trim().min(1).max(80),
        }),
      )
      .max(200, "Troppe mosse"),
    evolutions: z
      .array(
        z.object({
          to: z.string().trim().max(60),
          kind: z.enum(EVOLUTION_KINDS, "Metodo di evoluzione non valido"),
          speed: z.enum(EVOLUTION_SPEEDS, "Velocità non valida"),
          item: z.string().trim().max(60, "Strumento: massimo 60 caratteri"),
        }),
      )
      .max(10, "Al massimo 10 evoluzioni"),
    shared: z.boolean(),
  })
  .superRefine((v, ctx) => {
    if (v.types.length === 2 && v.types[0] === v.types[1]) {
      ctx.addIssue({ code: "custom", message: "I due tipi devono essere diversi" });
    }
    for (const a of POKEMON_ATTRIBUTES) {
      const [base, max] = v.attributes[a];
      if (base > max) {
        ctx.addIssue({
          code: "custom",
          message: `${label(a)}: la base (${base}) supera il massimo (${max})`,
        });
      }
    }
  });

export type FanmadeInput = z.input<typeof fanmadeInputSchema>;

/** Dati di gioco necessari alla validazione, iniettati dal server (o dai test). */
export interface FanmadeContext {
  /** Abilità ufficiale per nome (case-insensitive) → nome corretto. */
  officialAbility: (name: string) => string | undefined;
  /** Mossa ufficiale per nome (case-insensitive) → nome corretto. */
  officialMove: (name: string) => string | undefined;
  /** Specie di arrivo per nome (ufficiale o fanmade visibile) → id e nome corretto. */
  species: (name: string) => { id: string; name: string } | undefined;
}

/** `data` di `fanmade_species`: stessa forma di species.json senza id/nome, più le abilità nuove. */
export type FanmadeData = Omit<Species, "id" | "name"> & {
  customAbilities: { name: string; effect: string }[];
};

export type FanmadeResult =
  { ok: true; name: string; shared: boolean; data: FanmadeData } | { ok: false; error: string };

function label(a: PokemonAttribute) {
  return a.charAt(0).toUpperCase() + a.slice(1);
}

/** Valida l'input dell'editor e lo converte nel formato salvato. */
export function buildFanmade(input: unknown, ctx: FanmadeContext, selfId?: string): FanmadeResult {
  const parsed = fanmadeInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const v = parsed.data;

  // Abilità: ufficiali (nome normalizzato) oppure nuove con effetto obbligatorio.
  const custom: { name: string; effect: string }[] = [];
  const resolveAbility = (a: { name: string; effect: string }): string | { error: string } => {
    const official = ctx.officialAbility(a.name);
    if (official) return official;
    if (!a.effect) return { error: `Abilità nuova "${a.name}": scrivi l'effetto` };
    if (!custom.some((c) => c.name === a.name)) custom.push({ name: a.name, effect: a.effect });
    return a.name;
  };
  const abilities: string[] = [];
  for (const a of v.abilities.filter((x) => x.name)) {
    const r = resolveAbility(a);
    if (typeof r !== "string") return { ok: false, error: r.error };
    if (!abilities.includes(r)) abilities.push(r);
  }
  if (abilities.length === 0) return { ok: false, error: "Serve almeno l'abilità 1" };
  let hiddenAbility: string | null = null;
  if (v.hiddenAbility.name) {
    const r = resolveAbility(v.hiddenAbility);
    if (typeof r !== "string") return { ok: false, error: r.error };
    hiddenAbility = r;
  }

  // Mosse: solo ufficiali, senza doppioni nello stesso rank.
  const moves: { rank: string; name: string }[] = [];
  for (const m of v.moves) {
    const name = ctx.officialMove(m.name);
    if (!name) return { ok: false, error: `Mossa sconosciuta: ${m.name}` };
    if (!moves.some((x) => x.rank === m.rank && x.name === name))
      moves.push({ rank: m.rank, name });
  }
  moves.sort((a, b) => RANKS.indexOf(a.rank as never) - RANKS.indexOf(b.rank as never));

  // Evoluzioni: specie di arrivo ufficiale o fanmade visibile.
  const evolutions: Evolution[] = [];
  for (const e of v.evolutions) {
    if (!e.to) continue;
    const target = ctx.species(e.to);
    if (!target) return { ok: false, error: `Specie di arrivo sconosciuta: ${e.to}` };
    if (target.id === selfId || target.name.toLowerCase() === v.name.toLowerCase()) {
      return { ok: false, error: "Un Pokémon non può evolversi in sé stesso" };
    }
    evolutions.push({
      kind: e.kind,
      to: target.name,
      toId: target.id,
      ...(e.speed ? { speed: e.speed } : {}),
      ...(e.item ? { item: e.item } : {}),
    });
  }

  return {
    ok: true,
    name: v.name,
    shared: v.shared,
    data: {
      number: v.number ?? 0,
      types: v.types,
      baseHP: v.baseHP,
      attributes: v.attributes as Record<PokemonAttribute, [number, number]>,
      abilities,
      hiddenAbility,
      eventAbilities: "",
      recommendedRank: v.recommendedRank,
      legendary: v.legendary,
      goodStarter: false,
      genderType: v.genderType,
      heightM: v.heightM ?? 0,
      weightKg: v.weightKg ?? 0,
      category: v.category,
      description: v.description,
      image: v.image,
      evolutions,
      moves,
      customAbilities: custom,
    },
  };
}

/** Valori iniziali dell'editor: nuovo fanmade. */
export function emptyFanmadeInput(): FanmadeInput {
  return {
    name: "",
    types: ["Normal"],
    category: "",
    number: null,
    image: "",
    description: "",
    baseHP: 3,
    recommendedRank: "Starter",
    legendary: false,
    genderType: "",
    heightM: null,
    weightKg: null,
    attributes: {
      strength: [1, 3],
      dexterity: [1, 3],
      vitality: [1, 3],
      special: [1, 3],
      insight: [1, 3],
    },
    abilities: [{ name: "", effect: "" }],
    hiddenAbility: { name: "", effect: "" },
    moves: [],
    evolutions: [],
    shared: true,
  };
}

/** Valori iniziali dell'editor da un fanmade salvato. */
export function fanmadeToInput(
  name: string,
  shared: boolean,
  d: Partial<FanmadeData>,
): FanmadeInput {
  const effects = new Map((d.customAbilities ?? []).map((a) => [a.name, a.effect]));
  const ability = (n: string) => ({ name: n, effect: effects.get(n) ?? "" });
  const empty = emptyFanmadeInput();
  return {
    name,
    types: (d.types?.length ? d.types : empty.types) as FanmadeInput["types"],
    category: d.category ?? "",
    number: d.number || null,
    image: d.image ?? "",
    description: d.description ?? "",
    baseHP: d.baseHP || empty.baseHP,
    recommendedRank: (RANKS as readonly string[]).includes(d.recommendedRank ?? "")
      ? (d.recommendedRank as FanmadeInput["recommendedRank"])
      : "Starter",
    legendary: d.legendary ?? false,
    genderType: (GENDER_TYPES as readonly string[]).includes(d.genderType ?? "")
      ? (d.genderType as FanmadeInput["genderType"])
      : "",
    heightM: d.heightM || null,
    weightKg: d.weightKg || null,
    attributes: { ...empty.attributes, ...d.attributes },
    abilities: d.abilities?.length ? d.abilities.map(ability) : empty.abilities,
    hiddenAbility: ability(d.hiddenAbility ?? ""),
    moves: (d.moves ?? []) as FanmadeInput["moves"],
    evolutions: (d.evolutions ?? [])
      .filter((e) => e.to)
      .map((e) => ({
        to: e.to!,
        kind: ((EVOLUTION_KINDS as readonly string[]).includes(e.kind)
          ? e.kind
          : "Level") as FanmadeInput["evolutions"][number]["kind"],
        speed: ((EVOLUTION_SPEEDS as readonly string[]).includes(e.speed ?? "")
          ? (e.speed ?? "")
          : "") as FanmadeInput["evolutions"][number]["speed"],
        item: e.item ?? "",
      })),
    shared,
  };
}
