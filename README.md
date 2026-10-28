# Pokérole Tracker

Web app per le schede di **Pokérole 3.0** (allenatori, Pokémon, fanmade, campagne), pensata per il telefono al tavolo.
La specifica completa è in [POKEROLE-TRACKER-BUILD.md](POKEROLE-TRACKER-BUILD.md); il design in [design/](design/).

## Tecnologie

Next.js 16 (App Router) · React 19 · TypeScript 5.9 · Tailwind 4 · Drizzle + PostgreSQL (Neon) · Auth.js v5 · Vitest · Playwright.

## Avvio in locale

Requisiti: Node.js 22+.

```bash
npm install
cp .env.example .env.local   # poi compila le variabili
npm run db:migrate           # applica le migrazioni al database di DATABASE_URL
npm run dev                  # http://localhost:3000
```

Variabili (`.env.local`):

| Variabile               | Uso                                                           |
| ----------------------- | ------------------------------------------------------------- |
| `DATABASE_URL`          | Postgres di sviluppo (Neon, branch `dev`)                     |
| `TEST_DATABASE_URL`     | Postgres per i test E2E (Neon, branch `test`): viene svuotato |
| `AUTH_SECRET`           | segreto di Auth.js (`npx auth secret`)                        |
| `INVITE_CODE`           | codice per registrarsi; vuoto = registrazione libera          |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob per le immagini                                   |

## Script

| Comando                                          | Cosa fa                                                                         |
| ------------------------------------------------ | ------------------------------------------------------------------------------- |
| `npm run dev` / `build` / `start`                | Next.js                                                                         |
| `npm run lint` / `typecheck` / `format`          | qualità del codice                                                              |
| `npm test`                                       | test unitari (Vitest)                                                           |
| `npm run test:e2e`                               | test E2E (Playwright, telefono 390×844 e desktop 1280×800) sul database di test |
| `npm run db:generate` / `db:migrate` / `db:push` | migrazioni Drizzle                                                              |
| `npm run data:build -- <cartella v3.0>`          | rigenera `data/` dai JSON di Pokerole-Data                                      |
| `node scripts/extract-design.mjs`                | estrae le pagine del design in `design/extracted/` (non committata)             |

I test E2E includono un controllo di accessibilità automatico (axe, WCAG 2.1 AA, tema chiaro e scuro) e uno da tastiera. Non caricano mai immagini vere: il test `tests/e2e/immagini.spec.ts` usa il Vercel Blob reale (con `BLOB_READ_WRITE_TOKEN` in `.env.local`) e parte solo a mano:

```bash
E2E_BLOB=1 npx playwright test tests/e2e/immagini.spec.ts
```

## Dati di gioco

I file in `data/` sono generati da [Pokerole-Data](https://github.com/Pokerole-Software-Development/Pokerole-Data) e committati; l'app li importa lato server.

```bash
git clone --depth 1 https://github.com/Pokerole-Software-Development/Pokerole-Data.git /tmp/Pokerole-Data
npm run data:build -- /tmp/Pokerole-Data/v3.0
git add data && git commit -m "Aggiorna dati Pokérole"
```

Gli sprite sono caricati dal browser da `raw.githubusercontent.com` (non sono nel repository).

## Deploy

Vercel (progetto collegato al repository GitHub) con Neon Postgres e Vercel Blob; vedi §17 della specifica.

Le migrazioni partono da sole a ogni deploy: Vercel esegue lo script `vercel-build`
(`drizzle-kit migrate && next build`). `drizzle.config.ts` usa `DATABASE_URL_UNPOOLED`
(connessione diretta di Neon) e, se manca, `DATABASE_URL`; l'app usa sempre `DATABASE_URL` (pooled).
In Vercel lascia vuoto il Build Command del progetto, altrimenti `vercel-build` viene ignorato.
Pokémon è un marchio di Nintendo / Game Freak / The Pokémon Company; questo è un progetto amatoriale non ufficiale.
