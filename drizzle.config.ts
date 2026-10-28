import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

// In locale le variabili arrivano da .env.local; su Vercel e in CI sono già nell'ambiente
// (dotenv non sovrascrive quelle esistenti).
config({ path: ".env.local", quiet: true });

// Le migrazioni usano la connessione diretta di Neon; l'app usa quella pooled (DATABASE_URL).
const url = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL (o DATABASE_URL_UNPOOLED) mancante");

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: { url },
});
