CREATE TABLE "campaign_biomes" (
	"campaign_id" uuid NOT NULL,
	"biome" text NOT NULL,
	"species_id" text NOT NULL,
	"mode" text NOT NULL,
	"rarity" text,
	CONSTRAINT "campaign_biomes_campaign_id_biome_species_id_pk" PRIMARY KEY("campaign_id","biome","species_id")
);
--> statement-breakpoint
CREATE TABLE "campaigns" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"master_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"join_code" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "campaigns_join_code_unique" UNIQUE("join_code")
);
--> statement-breakpoint
CREATE TABLE "fanmade_species" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" uuid NOT NULL,
	"name" text NOT NULL,
	"shared" boolean DEFAULT true NOT NULL,
	"data" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pokemon" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"trainer_id" uuid NOT NULL,
	"species_id" text NOT NULL,
	"nickname" text DEFAULT '' NOT NULL,
	"gender" text,
	"rank" text DEFAULT 'Starter' NOT NULL,
	"nature" text DEFAULT '' NOT NULL,
	"ability" text DEFAULT '' NOT NULL,
	"held_item" text DEFAULT '' NOT NULL,
	"image" text,
	"attributes" jsonb NOT NULL,
	"social" jsonb NOT NULL,
	"skills" jsonb NOT NULL,
	"moves" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"tp" integer DEFAULT 0 NOT NULL,
	"current_hp" integer,
	"current_will" integer,
	"statuses" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"happiness" integer DEFAULT 2 NOT NULL,
	"loyalty" integer DEFAULT 2 NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"locked" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "trainers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"campaign_id" uuid,
	"npc_campaign_id" uuid,
	"name" text NOT NULL,
	"age" integer,
	"rank" text DEFAULT 'Starter' NOT NULL,
	"money" integer DEFAULT 0 NOT NULL,
	"image" text,
	"attributes" jsonb NOT NULL,
	"social" jsonb NOT NULL,
	"skills" jsonb NOT NULL,
	"current_hp" integer,
	"current_will" integer,
	"statuses" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"backpack" text DEFAULT '' NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"locked" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"username" text NOT NULL,
	"password_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_username_unique" UNIQUE("username")
);
--> statement-breakpoint
ALTER TABLE "campaign_biomes" ADD CONSTRAINT "campaign_biomes_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_master_id_users_id_fk" FOREIGN KEY ("master_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fanmade_species" ADD CONSTRAINT "fanmade_species_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pokemon" ADD CONSTRAINT "pokemon_trainer_id_trainers_id_fk" FOREIGN KEY ("trainer_id") REFERENCES "public"."trainers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trainers" ADD CONSTRAINT "trainers_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trainers" ADD CONSTRAINT "trainers_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trainers" ADD CONSTRAINT "trainers_npc_campaign_id_campaigns_id_fk" FOREIGN KEY ("npc_campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "campaigns_master_idx" ON "campaigns" USING btree ("master_id");--> statement-breakpoint
CREATE INDEX "fanmade_owner_idx" ON "fanmade_species" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "pokemon_trainer_idx" ON "pokemon" USING btree ("trainer_id");--> statement-breakpoint
CREATE INDEX "pokemon_species_idx" ON "pokemon" USING btree ("species_id");--> statement-breakpoint
CREATE INDEX "trainers_user_idx" ON "trainers" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "trainers_campaign_idx" ON "trainers" USING btree ("campaign_id");--> statement-breakpoint
CREATE INDEX "trainers_npc_campaign_idx" ON "trainers" USING btree ("npc_campaign_id");