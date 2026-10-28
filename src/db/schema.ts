import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

const createdAt = () => timestamp("created_at", { withTimezone: true }).defaultNow().notNull();
const updatedAt = () =>
  timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date());

export type TrainerAttributes = {
  strength: number;
  dexterity: number;
  vitality: number;
  insight: number;
};
export type PokemonAttributes = TrainerAttributes & { special: number };
export type SocialAttributes = {
  tough: number;
  cool: number;
  beauty: number;
  cute: number;
  clever: number;
};
export type Skills = Record<string, number>;

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  username: text("username").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  createdAt: createdAt(),
});

export const campaigns = pgTable(
  "campaigns",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    masterId: uuid("master_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description").notNull().default(""),
    joinCode: text("join_code").notNull().unique(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("campaigns_master_idx").on(t.masterId)],
);

export const trainers = pgTable(
  "trainers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    campaignId: uuid("campaign_id").references(() => campaigns.id, { onDelete: "set null" }),
    npcCampaignId: uuid("npc_campaign_id").references(() => campaigns.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    age: integer("age"),
    rank: text("rank").notNull().default("Starter"),
    money: integer("money").notNull().default(0),
    image: text("image"),
    attributes: jsonb("attributes").$type<TrainerAttributes>().notNull(),
    social: jsonb("social").$type<SocialAttributes>().notNull(),
    skills: jsonb("skills").$type<Skills>().notNull(),
    currentHp: integer("current_hp"),
    currentWill: integer("current_will"),
    statuses: jsonb("statuses").$type<string[]>().notNull().default([]),
    backpack: text("backpack").notNull().default(""),
    notes: text("notes").notNull().default(""),
    locked: boolean("locked").notNull().default(false),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("trainers_user_idx").on(t.userId),
    index("trainers_campaign_idx").on(t.campaignId),
    index("trainers_npc_campaign_idx").on(t.npcCampaignId),
  ],
);

export const pokemon = pgTable(
  "pokemon",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    trainerId: uuid("trainer_id")
      .notNull()
      .references(() => trainers.id, { onDelete: "cascade" }),
    /** Id ufficiale o 'fm-<uuid>' per i fanmade. */
    speciesId: text("species_id").notNull(),
    nickname: text("nickname").notNull().default(""),
    gender: text("gender"),
    rank: text("rank").notNull().default("Starter"),
    nature: text("nature").notNull().default(""),
    ability: text("ability").notNull().default(""),
    heldItem: text("held_item").notNull().default(""),
    image: text("image"),
    attributes: jsonb("attributes").$type<PokemonAttributes>().notNull(),
    social: jsonb("social").$type<SocialAttributes>().notNull(),
    skills: jsonb("skills").$type<Skills>().notNull(),
    moves: jsonb("moves").$type<string[]>().notNull().default([]),
    currentHp: integer("current_hp"),
    currentWill: integer("current_will"),
    statuses: jsonb("statuses").$type<string[]>().notNull().default([]),
    happiness: integer("happiness").notNull().default(2),
    loyalty: integer("loyalty").notNull().default(2),
    notes: text("notes").notNull().default(""),
    locked: boolean("locked").notNull().default(false),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("pokemon_trainer_idx").on(t.trainerId),
    index("pokemon_species_idx").on(t.speciesId),
  ],
);

export const fanmadeSpecies = pgTable(
  "fanmade_species",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ownerId: uuid("owner_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    shared: boolean("shared").notNull().default(true),
    /** Stessa forma di species.json (senza id/name) + customAbilities. */
    data: jsonb("data").$type<Record<string, unknown>>().notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("fanmade_owner_idx").on(t.ownerId)],
);

/** Solo le correzioni del master alla tabella automatica dei biomi. */
export const campaignBiomes = pgTable(
  "campaign_biomes",
  {
    campaignId: uuid("campaign_id")
      .notNull()
      .references(() => campaigns.id, { onDelete: "cascade" }),
    biome: text("biome").notNull(),
    speciesId: text("species_id").notNull(),
    mode: text("mode").$type<"add" | "remove">().notNull(),
    rarity: text("rarity").$type<"common" | "uncommon" | "rare">(),
  },
  (t) => [primaryKey({ columns: [t.campaignId, t.biome, t.speciesId] })],
);
