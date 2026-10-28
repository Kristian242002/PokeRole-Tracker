import "server-only";
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

// In sviluppo l'hot reload ricrea i moduli: il pool resta su globalThis (§14.7).
const globalForDb = globalThis as unknown as { pgPool?: Pool };

function createPool() {
  return new Pool({ connectionString: process.env.DATABASE_URL, max: 5 });
}

const pool = globalForDb.pgPool ?? createPool();
if (process.env.NODE_ENV !== "production") globalForDb.pgPool = pool;

export const db: NodePgDatabase<typeof schema> = drizzle(pool, { schema });
export { schema };
