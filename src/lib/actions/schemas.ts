import { z } from "zod";
import {
  POKEMON_ATTRIBUTES,
  POKEMON_SKILLS,
  RANKS,
  SOCIAL_ATTRIBUTES,
  STATUSES,
  TRAINER_ATTRIBUTES,
  TRAINER_SKILLS,
  skillKey,
} from "@/lib/rules";

const score = z
  .number()
  .int("Valore non valido")
  .min(0, "Valore non valido")
  .max(10, "Valore non valido");

const record = <K extends string>(keys: readonly K[]) =>
  z.object(Object.fromEntries(keys.map((k) => [k, score])) as Record<K, typeof score>);

const skills = (names: string[]) => record(names.map(skillKey));

const text = (max: number, label: string) =>
  z.string().max(max, `${label}: massimo ${max} caratteri`);

export const rankSchema = z.enum(RANKS, "Rank non valido");

export const playStateSchema = z.object({
  currentHp: z.number().int().min(0).max(999).nullable().optional(),
  currentWill: z.number().int().min(0).max(999).nullable().optional(),
  statuses: z
    .array(z.enum(STATUSES.map((s) => s.name) as [string, ...string[]]))
    .max(STATUSES.length)
    .optional(),
  locked: z.boolean().optional(),
});
export type PlayState = z.infer<typeof playStateSchema>;

export const trainerNameSchema = z
  .string()
  .trim()
  .min(1, "Scrivi un nome")
  .max(60, "Nome: massimo 60 caratteri");

export const trainerUpdateSchema = z.object({
  name: trainerNameSchema,
  age: z.number().int().min(0, "Età non valida").max(999, "Età non valida").nullable(),
  rank: rankSchema,
  money: z.number().int("Soldi non validi").min(-9_999_999).max(9_999_999),
  attributes: record(TRAINER_ATTRIBUTES),
  social: record(SOCIAL_ATTRIBUTES),
  skills: skills(TRAINER_SKILLS),
  backpack: text(5000, "Zaino"),
  notes: text(10000, "Note"),
});
export type TrainerUpdate = z.infer<typeof trainerUpdateSchema>;

export const pokemonUpdateSchema = z.object({
  nickname: text(60, "Soprannome").transform((s) => s.trim()),
  gender: z.enum(["M", "F"]).nullable(),
  rank: rankSchema,
  nature: text(40, "Natura"),
  ability: text(80, "Abilità"),
  heldItem: text(80, "Strumento tenuto"),
  attributes: record(POKEMON_ATTRIBUTES),
  social: record(SOCIAL_ATTRIBUTES),
  skills: skills(POKEMON_SKILLS),
  moves: z.array(z.string().max(80)).max(40, "Troppe mosse"),
  happiness: z.number().int().min(0).max(5),
  loyalty: z.number().int().min(0).max(5),
  notes: text(10000, "Note"),
});
export type PokemonUpdate = z.infer<typeof pokemonUpdateSchema>;

export const campaignSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Scrivi il nome della campagna")
    .max(80, "Nome: massimo 80 caratteri"),
  description: z.string().trim().max(2000, "Descrizione: massimo 2000 caratteri"),
});
export type CampaignInput = z.infer<typeof campaignSchema>;
