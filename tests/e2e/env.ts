import { config } from "dotenv";

config({ path: ".env.local", quiet: true });

/** Codice invito usato dal server dei test. */
export const TEST_INVITE_CODE = "PROVA-E2E";

/**
 * Database dei test: in CI il postgres:16 del workflow (DATABASE_URL),
 * in locale TEST_DATABASE_URL (Neon branch "test"). Mai il database di sviluppo.
 */
export function testDatabaseUrl(): string {
  const url = process.env.CI ? process.env.DATABASE_URL : process.env.TEST_DATABASE_URL;
  if (!url) throw new Error("TEST_DATABASE_URL mancante in .env.local (database dei test E2E)");
  if (!process.env.CI && url === process.env.DATABASE_URL) {
    throw new Error("TEST_DATABASE_URL coincide con DATABASE_URL: i test svuotano il database!");
  }
  return url;
}
