import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";
import { testDatabaseUrl } from "./env";

/** Prima della suite: migrazioni e svuotamento del database di TEST (mai dev o main). */
export default async function globalSetup() {
  const pool = new Pool({ connectionString: testDatabaseUrl(), max: 1 });
  try {
    await migrate(drizzle(pool), { migrationsFolder: "drizzle" });
    await pool.query(
      "TRUNCATE campaign_biomes, pokemon, trainers, fanmade_species, campaigns, users CASCADE",
    );
  } finally {
    await pool.end();
  }
}
