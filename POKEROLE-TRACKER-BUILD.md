# Pokérole Tracker — Specifica di costruzione per Claude Code

> **Per Claude Code.** Questo documento definisce tutto quello che serve per costruire il sito **da zero**: tecnologie con versioni, sorgenti dei dati, struttura del repository, modello dati, regole di gioco, pagine, permessi, algoritmi, test, deploy e problemi già incontrati.
>
> - Il **design** è stato fatto con Claude Design e si trova nella cartella `design/` del repository (export, screenshot o codice). **Per l'aspetto grafico (layout, colori, tipografia, componenti) segui il design. Per il comportamento segui questo documento.** Se i due sono in conflitto su un comportamento, vince questo documento; se manca qualcosa nel design, inventalo coerente con lo stile del design.
> - Lavora per **fasi** (§15). Alla fine di ogni fase: typecheck, lint, test e build devono passare, poi commit.
> - Lingua dell'interfaccia: **italiano**. Nomi di gioco (mosse, abilità, strumenti, skill, rank, nature, tipi) **in inglese**, come nel manuale.
> - Non chiedere conferme per scelte già scritte qui. Le cose da verificare sono elencate in §18.

---

## 0. Indice

1. Prodotto e ruoli
2. Tecnologie e versioni
3. Sorgenti esterne (GitHub e URL)
4. Struttura del repository
5. Pipeline dei dati di gioco
6. Regole di gioco
7. Database
8. Autenticazione e permessi
9. Principi di interfaccia
10. Pagine e rotte
11. Generatore e biomi
12. Immagini
13. Server actions / API
14. Problemi già incontrati (da non ripetere)
15. Fasi di lavoro e criteri di accettazione
16. Test
17. Deploy
18. Punti aperti da verificare
19. Fuori scope

---

## 1. Prodotto e ruoli

Web app per gestire le schede del gioco di ruolo da tavolo **Pokérole 3.0**, usata da un gruppo di amici, soprattutto **da telefono durante la sessione**. Sostituisce pokeroledex.nl (non più funzionante).

Funzioni:

- consultazione dei dati di gioco: Pokémon, Mosse, Strumenti;
- schede di **allenatori** e **Pokémon** modificabili e usabili al tavolo (HP, Will, stati);
- **Pokémon fanmade** creati dagli utenti;
- **campagne** per il master con allenatori/Pokémon propri, vista in sola lettura dei giocatori collegati, **generatore di incontri per bioma**, invio di Pokémon ai giocatori.

| Ruolo     | Cosa usa                                                              |
| --------- | --------------------------------------------------------------------- |
| Giocatore | Pokémon, Mosse, Strumenti, I miei allenatori, I miei Pokémon, Fanmade |
| Master    |

Non esiste un ruolo fisso: chi crea una campagna ne è il master. Un utente può avere sia allenatori propri sia campagne.

---

## 2. Tecnologie e versioni

Versioni verificate funzionanti insieme (ottobre 2026). Usa queste major; patch più recenti vanno bene.

| Cosa           | Pacchetto                             | Versione                                             |
| -------------- | ------------------------------------- | ---------------------------------------------------- |
| Runtime        | Node.js                               | 22 LTS                                               |
| Framework      | `next`                                | 16.x (App Router, Server Components, Server Actions) |
| UI             | `react`, `react-dom`                  | 19.x                                                 |
| Linguaggio     | `typescript`                          | **5.9.x** (non la 7: con Next 16 usa la 5)           |
| Stili          | `tailwindcss`, `@tailwindcss/postcss` | 4.x                                                  |
| ORM            | `drizzle-orm`                         | 0.45.x                                               |
| Migrazioni     | `drizzle-kit`                         | 0.31.x                                               |
| Driver DB      | `pg` (+ `@types/pg`)                  | 8.x                                                  |
| Auth           | `next-auth`                           | **5.0.0-beta.x** (Auth.js v5)                        |
| Hash password  | `bcryptjs`                            | 3.x                                                  |
| Validazione    | `zod`                                 | 4.x                                                  |
| Guardia server | `server-only`                         | ultima                                               |
| Immagini       | `@vercel/blob`                        | ultima                                               |
| Script         | `tsx`, `dotenv`                       | ultime                                               |
| Test unitari   | `vitest`                              | ultima                                               |
| Test E2E       | `@playwright/test`                    | ultima                                               |
| Lint/format    | `eslint` (config Next), `prettier`    | ultime                                               |

**Database**: PostgreSQL 16+ (in produzione **Neon**, collegato da Vercel).
**Hosting**: **Vercel** (piano Hobby).
**Repository**: **GitHub**, con GitHub Actions per la CI.

**Non usare Prisma**: richiede di scaricare binari da `binaries.prisma.sh` durante install/generate, che in alcuni ambienti è bloccato. Drizzle è puro JS e funziona ovunque.

---

## 3. Sorgenti esterne

### 3.1 Dati di gioco

- **Pokerole-Data** (fonte ufficiale della community, usata anche da pokeroledex.nl, Foundry, bot Discord):
  `https://github.com/Pokerole-Software-Development/Pokerole-Data`
  - `v3.0/Pokedex/*.json`: 1200 specie
  - `v3.0/Moves/*.json`: 892 mosse
  - `v3.0/Abilities/*.json`: 305 abilità
  - `v3.0/Items/*.json`: 236 strumenti
  - `v3.0/Natures/*.json`: 25 nature
  - `images/HomeSprites`, `images/BookSprites`, `images/BoxSprites`, `images/ItemSprites` (~253 MB: **non** copiarle nel repo)
  - Clonare con `git clone --depth 1 …` solo per rigenerare i dati; non è una dipendenza del progetto.
- **Regole (GM Screen 3.0)**: `https://github.com/Pokerole-Software-Development/Pokerole-Obsidian-SRD/blob/master/PokeRole%20v3.0%20GM%20Screen.md`, fonte delle tabelle in §6.

### 3.2 Sprite (caricati dal browser, non nel repo)

```
https://raw.githubusercontent.com/Pokerole-Software-Development/Pokerole-Data/master/images/HomeSprites/<Image>
https://raw.githubusercontent.com/Pokerole-Software-Development/Pokerole-Data/master/images/BookSprites/<Image>   (fallback)
https://raw.githubusercontent.com/Pokerole-Software-Development/Pokerole-Data/master/images/ItemSprites/<Image>   (strumenti)
```

`<Image>` è il campo `Image` del JSON (es. `barboach.png`). Copertura verificata: HomeSprites manca solo `rotom-dex-form.png`; BookSprites le ha tutte; BoxSprites ne manca 168 (non usarla). Il README del repo indica anche la base `…/Willowlark/Pokerole-Data/master/…`: rendi la base configurabile con una costante e verifica che risponda.

Il componente sprite: prova HomeSprites → in errore BookSprites → in errore segnaposto. Se `image` è già un URL completo (fanmade, immagini caricate) usalo così com'è.

---

## 4. Struttura del repository

```
pokerole-tracker/
├─ design/                     # export di Claude Design (riferimento grafico)
├─ data/                       # JSON di gioco generati (committati)
│  ├─ species.json
│  ├─ moves.json
│  ├─ abilities.json
│  ├─ items.json
│  ├─ natures.json
│  └─ move-learners.json       # indice mossa → [specie, rank], generato
├─ scripts/
│  └─ build-data.ts            # pipeline §5
├─ drizzle/                    # migrazioni generate
├─ src/
│  ├─ app/                     # rotte (§10)
│  ├─ components/              # UI condivisa
│  ├─ db/
│  │  ├─ schema.ts
│  │  └─ index.ts
│  ├─ lib/
│  │  ├─ rules.ts              # regole §6 (puro, usabile anche lato client)
│  │  ├─ warnings.ts           # calcolo del riquadro avvisi (puro, testato)
│  │  ├─ evolution.ts          # regola B (puro, testato)
│  │  ├─ generator.ts          # generatore (puro, con RNG iniettabile, testato)
│  │  ├─ biomes.ts             # tabella automatica + rarità
│  │  ├─ data.ts               # import dei JSON ("server-only")
│  │  ├─ species.ts            # risoluzione specie ufficiali + fanmade
│  │  └─ actions/              # server actions per dominio
│  └─ auth.ts
├─ tests/
│  ├─ unit/
│  └─ e2e/
├─ .github/workflows/ci.yml
├─ drizzle.config.ts
├─ .env.example
└─ README.md
```

Alias TypeScript: `@/*` → `src/*`, `@data/*` → `data/*`. `resolveJsonModule: true`.

Script `package.json`:

```
dev, build, start, lint, typecheck (tsc --noEmit), test (vitest run),
test:e2e (playwright test), db:generate (drizzle-kit generate),
db:migrate (drizzle-kit migrate), db:push (drizzle-kit push),
data:build (tsx scripts/build-data.ts <percorso>/Pokerole-Data/v3.0)
```

Variabili d'ambiente (`.env.example`):

```
DATABASE_URL=            # Postgres (Neon in produzione)
AUTH_SECRET=             # npx auth secret
INVITE_CODE=             # codice per registrarsi; vuoto = registrazione libera
BLOB_READ_WRITE_TOKEN=   # Vercel Blob (lo imposta Vercel collegando lo store)
```

---

## 5. Pipeline dei dati di gioco

`scripts/build-data.ts <cartella v3.0>` legge i JSON uno per uno e scrive file compatti in `data/`. I file generati si **committano**. L'app li importa staticamente (finiscono nel bundle server; nessuna chiamata esterna a runtime).

### 5.1 `species.json`

Da `Pokedex/*.json`, ordinato per `Number` poi `Name`:

| Campo output          | Sorgente                                                                                                                                                  |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`                  | `_id` (es. `barboach`, `abomasnow-mega-form`)                                                                                                             |
| `number`              | `Number`                                                                                                                                                  |
| `name`                | `Name`                                                                                                                                                    |
| `types`               | `[Type1, Type2]` senza vuoti                                                                                                                              |
| `baseHP`              | `BaseHP`                                                                                                                                                  |
| `attributes`          | `{ strength:[Strength,MaxStrength], dexterity:[…], vitality:[…], special:[…], insight:[…] }`                                                              |
| `abilities`           | `[Ability1, Ability2]` senza vuoti                                                                                                                        |
| `hiddenAbility`       | `HiddenAbility` o `null`                                                                                                                                  |
| `eventAbilities`      | `EventAbilities` (stringa, può essere vuota)                                                                                                              |
| `recommendedRank`     | `RecommendedRank`                                                                                                                                         |
| `legendary`           | `Legendary`                                                                                                                                               |
| `goodStarter`         | `GoodStarter`                                                                                                                                             |
| `genderType`          | `GenderType`: `""` = maschio o femmina, `"N"` = senza genere, `"M"` = solo maschio, `"F"` = solo femmina                                                  |
| `heightM`, `weightKg` | `Height.Meters`, `Weight.Kilograms`                                                                                                                       |
| `category`            | `DexCategory`                                                                                                                                             |
| `description`         | `DexDescription`                                                                                                                                          |
| `image`               | `Image`                                                                                                                                                   |
| `evolutions`          | `Evolutions[]` → `{ from, to, kind, speed, item }` (`Kind` ∈ Level, Stone, Item, Trade, Special, Mega, Form, Stat; `Speed` ∈ Fast, Medium, Slow, Unknown) |
| `moves`               | `Moves[]` → `{ rank: Learned, name: Name }`                                                                                                               |

### 5.2 `moves.json`

`{ id, name, type, category (Physical|Special|Support), power, damage: [Damage1, Damage2], accuracy: [Accuracy1, Accuracy2], target, effect, description, addedEffects }` (vuoti esclusi dagli array).

Abbreviazioni per le righe compatte ("A: STR + BRL", "D: STR + 2"): genera in `rules.ts` una mappa da nome attributo/skill a sigla di 3 lettere (Strength STR, Dexterity DEX, Vitality VIT, Special SPC, Insight INS, Tough TGH, Cool COL, Beauty BTY, Cute CTE, Clever CLV, Brawl BRL, Channel CHN, Clash CLS, Evasion EVA, Alert ALR, Athletic ATH, Nature NAT, Stealth STL, Allure ALL, Etiquette ETQ, Intimidate ITM, Perform PRF, Will WIL…). Valori sconosciuti: mostra il testo originale.

### 5.3 `abilities.json`

`{ id, name, effect, description }`.

### 5.4 `items.json`

`{ id, name, pocket, category, description, oneUse, price (TrainerPrice: numero o "Not for Sale"), image, forPokemon?, forTypes?, boost?, value?, cures?, healthRestored?, source }`.
Tasche: HeldItems, Medicine, TrainerItems, Pokeballs, EvolutionItem, TechnicalMachine. Categorie: MegaStone, BattleItem, ZCrystal, TypeBoosting, Healing, Berry, Status, Vitamin, MonBoosting, vuota.

### 5.5 `natures.json`

`{ id, name, confidence, keywords, description }`.

### 5.6 `move-learners.json`

Indice inverso: `{ [moveName]: [{ speciesId, rank }] }` costruito dai learnset ufficiali. In app si aggiungono a runtime i fanmade visibili all'utente. Verifica: "Mud Slap" → 84 specie.

**Nota:** nel dataset **non esistono biomi/habitat**. Vedi §11.

---

## 6. Regole di gioco

Tutte in `src/lib/rules.ts`, pure e testate.

### 6.1 Rank

| Rank     | Icona Ball      | Bersagli max | Limite skill | Punti attributo (tot.) | Punti skill (tot.) |
| -------- | --------------- | ------------ | ------------ | ---------------------- | ------------------ |
| Starter  | _da verificare_ | 1            | 1            | 0                      | 5                  |
| Rookie   | Poké Ball       | 2            | 2            | 2                      | 10                 |
| Standard | Great Ball      | 3            | 3            | 4                      | 14                 |
| Advanced | Ultra Ball      | 4            | 4            | 6                      | 17                 |
| Expert   | _da verificare_ | 5            | 5            | 8                      | 19                 |
| Ace      | _da verificare_ | 6            | 5            | 10                     | 20                 |
| Master   | _da verificare_ | 8            | 5            | 10                     | 22                 |
| Champion | _da verificare_ | 10           | 5            | 14                     | 25                 |

Valgono per allenatori e Pokémon.

Dal manuale (p. 30–31), in aggiunta alla tabella:

- **Punti sociali (tot.)**: uguali ai punti attributo del rank (Starter 0, Rookie 2, Standard 4, Advanced 6, Expert 8, Ace 10, Master 10, Champion 14). Punti sociali spesi = Σ (valore − 1).
- **Master e oltre**: HP, Will, Iniziativa base e Difesa/Dif. Speciale +3; +2 dadi a tutti i tiri che usano una skill (solo nota).
- **Champion**: gli attributi (anche sociali) possono superare il limite di 2 punti.
- Un Pokémon non può avere un rank più alto del suo allenatore (avviso).

Le icone sono SVG originali disegnate per il progetto (non asset ufficiali), mappate in una costante `RANK_ICON`; quelle "da verificare" usano un segnaposto finché non vengono confermate.

### 6.2 Attributi

|         | Allenatore                                                                    | Pokémon                                                                          |
| ------- | ----------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| Fisici  | Strength, Dexterity, Vitality, Insight (**niente Special**), da 1 a 5, base 1 | Strength, Dexterity, Vitality, Special, Insight; base e massimo **della specie** |
| Sociali | Tough, Cool, Beauty, Cute, Clever, 1–5, base 1                                | Tough, Cool, Beauty, Cute, Clever, 1–5, base 1                                   |

Punti attributo spesi = Σ (valore − base). I sociali hanno un conteggio a parte (punti sociali, vedi §6.1).

### 6.3 Skill (0–5, limite = limite skill del rank)

**Allenatore** (17):

- Fight: Brawl, Throw, Weapons, Evasion
- Survival: Alert, Athletic, Nature, Stealth
- Social: Charm, Empathy, Etiquette, Intimidate, Perform
- Knowledge: Crafts, Lore, Medicine, Science

**Pokémon** (12):

- Fight: Brawl, Channel, Clash, Evasion
- Survival: Alert, Athletic, Nature, Stealth
- Social: Allure, Etiquette, Intimidate, Perform

### 6.4 Formule

| Valore                   | Allenatore              | Pokémon                   |
| ------------------------ | ----------------------- | ------------------------- |
| HP massimi               | Vitality + 4            | BaseHP specie + Vitality  |
| Will massimi             | Insight + 3             | Insight + 3               |
| Difesa / Difesa Speciale | —                       | Vitality / Insight        |
| Iniziativa               | 1d6 + Dexterity + Alert | 1d6 + Dexterity + Alert   |
| Limite mosse             | —                       | Insight + 3 (solo avviso) |

HP e Will **attuali** sono salvati; se superano il massimo (es. dopo aver abbassato Vitality) si mostrano limitati al massimo e compare un avviso.

**Penalità da dolore** (calcolata, non salvata): 1 penalità se HP attuali ≤ metà dei massimi (arrotondata per difetto), 2 penalità se HP attuali = 1. A 0 HP: "KO". Ogni penalità = −1 successo a tutti i tiri.

### 6.5 Stati

| Stato          | Effetto breve (per la ⓘ)                                                       |
| -------------- | ------------------------------------------------------------------------------ |
| Burn 1°        | 1 danno a fine round. Immuni i Fire. Cura: Dex+Athletic, 4 successi cumulativi |
| Burn 2°        | 2 danni letali a fine round. Cura: 6 successi                                  |
| Burn 3°        | 3 danni letali, +2 ogni round. Cura: 8 successi                                |
| Confused       | Se un'azione fallisce subisci 1 danno; −1/−2/−3 successi in base al rank       |
| Disabled       | Una mossa non utilizzabile                                                     |
| Paralysis      | −2 Dexterity, metà velocità. Immuni gli Electric                               |
| Flinched       | Salta la prossima azione                                                       |
| Poison         | 2 danni a fine round. Immuni Poison e Steel                                    |
| Badly Poisoned | 2 danni letali, +2 ogni round                                                  |
| Frozen         | Nessuna azione. Immuni gli Ice                                                 |
| In Love        | Metà danni contro il bersaglio                                                 |
| Sleep          | Nessuna azione; Insight 5 successi cumulativi per svegliarsi                   |

Salvati come array di stringhe; si attivano/disattivano anche a scheda bloccata.

### 6.6 Salire di rank

- Pulsante **"Sali di rank → X"** (solo Pokémon): passa al rank successivo. Niente TP.
- Il rank resta modificabile **a mano** dalla tendina.
- Dopo il cambio, il riquadro avvisi mostra cosa è cambiato e cosa resta da spendere.

### 6.7 Evoluzione (regola B, decisa)

Funzione pura `evolve(pokemon, fromSpecies, toSpecies)` in `lib/evolution.ts`:

- per ogni attributo: `nuovo = min(toMax, toBase + max(0, vecchio − fromBase))`;
- abilità: mantenuta se esiste nella nuova specie, altrimenti la prima della nuova;
- mosse, rank, soprannome, sociali, skill, HP/Will attuali restano (HP/Will limitati ai nuovi massimi);
- ritorna anche il **riepilogo** delle differenze per il riquadro: "Strength 2 → 3, Vitality 2 → 3; nuovi massimi: Strength 5, Vitality 6".
- Esempio di test: Barboach Strength 2 (base 1) → Whiscash (base 2) = 3.

Il pulsante **"Evolvi in X"** compare solo se la specie ha evoluzioni con `to`; se ce n'è più di una, una per pulsante. Mostra metodo/velocità/strumento come informazione, non come vincolo. Chiedi conferma prima di evolvere.

### 6.8 Mosse del Pokémon

- Si può aggiungere **qualsiasi** mossa delle 892, non solo il learnset.
- Ogni mossa conosciuta ha un'etichetta calcolata:
  - `✓ learnset (Rank)` se è nel learnset a rank ≤ rank attuale;
  - `⚠ sopra il rank` se è nel learnset ma a rank > attuale;
  - `⚠ fuori learnset` se non è nel learnset.
- Limite Insight + 3: solo avviso.

### 6.9 Riquadro avvisi

Funzione pura `computeWarnings(sheet, kind, species?)` in `lib/warnings.ts`, testata. Ritorna una lista di messaggi in italiano. Casi:

- punti attributo: "Ti mancano da spendere N punti attributo" / "Hai N punti attributo oltre il limite del rank";
- punti skill: idem;
- skill sopra il limite: "Lore è a 5, ma ad Advanced il massimo è 4";
- attributo Pokémon sopra il massimo della specie o sotto la base;
- mosse oltre il limite: "Conosce 8 mosse, il limite è 7 (Insight + 3)";
- mosse fuori learnset / sopra il rank (una riga per mossa);
- HP o Will attuali sopra il massimo;
- dopo rank up o evoluzione: riepilogo dei cambiamenti (temporaneo, fino al salvataggio successivo).
  Il riquadro è visibile quando la lista non è vuota e sparisce quando è vuota. **Non blocca mai il salvataggio.**

---

## 7. Database

Drizzle, PostgreSQL. Migrazioni versionate in `drizzle/` (`db:generate` + `db:migrate`). Tutti gli id sono `uuid` con `defaultRandom()`, timestamp `created_at`/`updated_at`.

```ts
users
  id uuid pk
  username text unique not null      // minuscolo, /^[a-z0-9_.-]{3,24}$/
  password_hash text not null        // bcrypt, cost 10
  created_at

campaigns
  id uuid pk
  master_id uuid → users.id on delete cascade
  name text not null
  description text default ''
  join_code text unique not null     // 6 caratteri A–Z0–9 senza ambigui (0,O,1,I)
  created_at, updated_at

trainers
  id uuid pk
  user_id uuid → users.id on delete cascade      // proprietario
  campaign_id uuid → campaigns.id on delete set null  // per i giocatori: campagna collegata
  npc_campaign_id uuid → campaigns.id on delete cascade // valorizzato = allenatore del master in quella campagna
  name text not null
  age integer null
  rank text not null default 'Starter'
  money integer default 0
  image text null                    // URL Blob
  attributes jsonb  {strength,dexterity,vitality,insight}
  social jsonb      {tough,cool,beauty,cute,clever}
  skills jsonb      {brawl,…}
  current_hp integer null            // null = pieno
  current_will integer null
  statuses jsonb string[]
  backpack text default ''
  notes text default ''
  locked boolean default false
  created_at, updated_at
  index(user_id), index(campaign_id), index(npc_campaign_id)

pokemon
  id uuid pk
  trainer_id uuid → trainers.id on delete cascade
  species_id text not null           // id ufficiale o 'fm-<uuid>'
  nickname text default ''
  gender text null                   // 'M' | 'F' | null
  rank text default 'Starter'
  nature text default ''
  ability text default ''
  held_item text default ''
  image text null                    // override dello sprite
  attributes jsonb {strength,dexterity,vitality,special,insight}
  social jsonb
  skills jsonb
  moves jsonb string[]
  current_hp integer null
  current_will integer null
  statuses jsonb string[]
  happiness integer default 2        // 0–5
  loyalty integer default 2          // 0–5
  notes text default ''
  locked boolean default false
  created_at, updated_at
  index(trainer_id), index(species_id)

fanmade_species
  id uuid pk
  owner_id uuid → users.id on delete cascade
  name text not null
  shared boolean default true
  data jsonb  // stessa forma di species.json (senza id/name) + customAbilities [{name,effect}]
  created_at, updated_at
  index(owner_id)

campaign_biomes      // solo le correzioni del master alla tabella automatica
  campaign_id uuid → campaigns.id on delete cascade
  biome text not null
  species_id text not null
  mode text not null          // 'add' | 'remove'
  rarity text null            // 'common' | 'uncommon' | 'rare' (override)
  primary key (campaign_id, biome, species_id)
```

Regole:

- "I miei allenatori" = `trainers where user_id = me and npc_campaign_id is null`.
- Allenatori del master in una campagna = `trainers where npc_campaign_id = X` (con `user_id` = master).
- Giocatori collegati = `trainers where campaign_id = X and npc_campaign_id is null`.
- "Invia a…" = `update pokemon set trainer_id = <allenatore del giocatore>` (spostamento).
- Gli id fanmade hanno prefisso **`fm-`** per non scontrarsi con gli id ufficiali.
- Un fanmade **non si elimina** se esiste un Pokémon con quella specie (errore chiaro); si può rendere privato.

---

## 8. Autenticazione e permessi

- Auth.js v5, provider **Credentials** (nome utente + password), sessione **JWT**, `trustHost: true`, pagina di login `/login`.
- Registrazione su `/register`: se `INVITE_CODE` è impostato, il codice è obbligatorio.
- Dopo un errore di login/registrazione il form **mantiene** nome utente e codice invito (vedi §14).
- Ogni server action ricontrolla la proprietà lato server: mai fidarsi degli id dal client.

| Azione                                                   | Chi                                                         |
| -------------------------------------------------------- | ----------------------------------------------------------- |
| Vedere Pokédex, Mosse, Strumenti                         | tutti (anche non loggati); fanmade: solo condivisi o propri |
| CRUD allenatori/Pokémon propri                           | proprietario                                                |
| Collegare un proprio allenatore a una campagna (codice)  | proprietario dell'allenatore                                |
| Creare/modificare/eliminare campagne, rigenerare codice  | master della campagna                                       |
| CRUD allenatori e Pokémon del master nella campagna      | master                                                      |
| Vedere schede dei giocatori collegati (**sola lettura**) | master                                                      |
| Rimuovere un giocatore (azzera `campaign_id`)            | master                                                      |
| Invia a… un Pokémon a un giocatore collegato             | master                                                      |
| Generatore, Biomi                                        | master                                                      |
| CRUD fanmade                                             | autore (vedere: autore o se condiviso)                      |

Accessi non permessi → **404** (non 403), per non rivelare l'esistenza delle risorse.

---

## 9. Principi di interfaccia

- **Mobile first**, usabile con una mano. Tema chiaro e scuro (segue il sistema).
- **Schede sempre modificabili a mano.** Le regole producono solo avvisi (§6.9).
- **Una sola pagina per scheda**: in alto la parte **in gioco** (HP, Will, stati, penalità), sotto la scheda.
- **Lucchetto**: blocca la modifica della scheda; da bloccata restano attivi solo HP, Will e stati. Salvato in `locked`.
- **Salvataggio**: barra fissa in basso con "Modifiche non salvate" / "Salvataggio…" / "Salvato" e "Salva modifiche". HP, Will e stati si salvano **subito** a ogni tocco (con debounce ~400 ms, aggiornamento ottimistico), così al tavolo non serve premere Salva. Avviso del browser se si chiude con modifiche non salvate.
- **Mosse ovunque espandibili**: tipo, categoria, precisione, danno, bersaglio, effetto, descrizione. Riga compatta: icona rank (se pertinente), icona categoria, nome, "A: …", "D: …", colore del tipo.
- **Abilità ovunque con ⓘ** (popover accessibile, apribile con tocco e tastiera) che mostra l'effetto.
- **Pallini**: tre toni — base (bloccata, attenuata), investito (pieno), vuoto fino al massimo; per gli attributi del Pokémon scala fissa a 10 con le posizioni oltre il massimo attenuate.
- **Badge tipi**: colore + nome sempre scritto. Colori:
  Normal #9a9a78, Fire #e8742c, Water #4a7fe0, Electric #e9b500, Grass #56a83a, Ice #6cc4c4, Fighting #b5322a, Poison #9440a0, Ground #c9a14a, Flying #8f7fe6, Psychic #e94d7d, Bug #93a51c, Rock #a8913a, Ghost #6a5596, Dragon #6a3ef0, Dark #6b5546, Steel #9a9ab8, Fairy #d47ea0 (adatta al design se diverso, mantenendo contrasto leggibile).
- **Sociali colorati**: Tough giallo, Cool arancio, Beauty azzurro, Cute rosa, Clever verde.
- Accessibilità: focus visibile, etichette su tutti i controlli, `aria-pressed` sui pallini, `prefers-reduced-motion` rispettato, nessuna informazione solo col colore.
- Nessun logo, font o asset grafico ufficiale Pokémon (gli sprite del dataset community sono l'unica eccezione).

---

## 10. Pagine e rotte

| Rotta                               | Pagina                                                   | Accesso                                                                          |
| ----------------------------------- | -------------------------------------------------------- | -------------------------------------------------------------------------------- |
| `/login`, `/register`               | Accesso                                                  | pubblico                                                                         |
| `/`                                 | redirect: loggato → `/pokemon/miei`, altrimenti `/login` | —                                                                                |
| `/dex`                              | Pokédex: elenco                                          | pubblico                                                                         |
| `/dex/[speciesId]`                  | Scheda specie                                            | pubblico (fanmade: visibilità)                                                   |
| `/mosse`                            | Mosse                                                    | pubblico                                                                         |
| `/strumenti`                        | Strumenti                                                | pubblico                                                                         |
| `/allenatori`                       | I miei allenatori                                        | utente                                                                           |
| `/allenatori/[id]`                  | Scheda allenatore                                        | proprietario; master in sola lettura se collegato                                |
| `/pokemon/miei`                     | I miei Pokémon                                           | utente                                                                           |
| `/pokemon/[id]`                     | Scheda Pokémon                                           | proprietario dell'allenatore; master in sola lettura se l'allenatore è collegato |
| `/fanmade`                          | Fanmade                                                  | utente                                                                           |
| `/fanmade/nuovo`, `/fanmade/[fmId]` | Editor fanmade                                           | utente / autore                                                                  |
| `/campagne`                         | Le mie campagne                                          | utente                                                                           |
| `/campagne/[id]`                    | Dettaglio campagna                                       | master                                                                           |
| `/campagne/[id]/generatore`         | Generatore                                               | master                                                                           |
| `/campagne/[id]/biomi`              | Biomi                                                    | master                                                                           |

Navigazione principale: Pokédex · Mosse · Strumenti · Allenatori · I miei Pokémon · Fanmade · Campagne, più "Esci (nome utente)". Su mobile: menu compatto secondo il design.

### 10.1 Pokédex `/dex`

- Griglia: sprite, numero (#0001) o "Fanmade", nome, tipi. Fanmade visibili in cima.
- Ricerca per nome o numero (lato client sui dati già caricati), filtro tipo, "Solo fanmade". Paginazione "Mostra altri" (60 per volta).
- Niente calcolatore di debolezze.

### 10.2 Scheda specie `/dex/[speciesId]`

- Intestazione: sprite, numero, nome, categoria, tipi, descrizione.
- Rank consigliato (icona Ball), HP base, altezza, peso, genere possibile.
- Attributi base/massimi a pallini (scala 10) + "2 / 4".
- Abilità + nascosta con ⓘ (per i fanmade anche quelle inventate).
- Evoluzioni con link (ufficiali o fanmade), metodo, velocità, strumento.
- Mosse in righe compatte colorate per tipo, raggruppate per rank, due colonne su desktop, espandibili.
- Pulsante **"+"** (utente loggato): scegli un tuo allenatore → crea il Pokémon e apre la scheda.
- Fanmade dell'utente: "Modifica".

### 10.3 Mosse `/mosse`

- Elenco delle 892 mosse: nome, tipo, categoria, potenza, bersaglio. Ricerca, filtri tipo e categoria.
- Riga espandibile: precisione, danno, effetto, descrizione, **Chi la impara** (specie con rank, link al Pokédex; include i fanmade visibili).
- Niente mosse fanmade.

### 10.4 Strumenti `/strumenti`

- 236 strumenti (Megapietre e Cristalli Z inclusi): icona, nome, tasca, prezzo o "Non in vendita", descrizione breve.
- Ricerca, filtro tasca. Riga espandibile: descrizione completa, monouso, per quale Pokémon/tipo, boost, HP curati, stati curati.
- Niente strumenti fanmade.

### 10.5 I miei allenatori `/allenatori`

- Riquadri: ritratto, nome, rank (icona), numero Pokémon. "Crea allenatore" (nome → crea e apre).

### 10.6 Scheda allenatore `/allenatori/[id]`

In gioco: HP (Vitality + 4) e Will (Insight + 3) attuali/massimi con −/+ grandi; stati; penalità da dolore.
Scheda: ritratto (caricabile), nome, età, rank (tendina con icone; per l'allenatore il rank si cambia solo a mano), soldi, attributi, sociali, skill (§6.3), zaino (testo libero), **codice campagna** (campo + "Collega"/"Scollega"; mostra il nome della campagna collegata), note, elenco dei suoi Pokémon (riquadri con HP), "Aggiungi Pokémon" (ricerca nel Pokédex), riquadro avvisi, lucchetto, elimina (con conferma).
In sola lettura (master): stessa pagina senza controlli di modifica.

### 10.7 I miei Pokémon `/pokemon/miei`

- Griglia unica di tutti i Pokémon di tutti gli allenatori dell'utente (non quelli NPC delle campagne): immagine, soprannome (o nome specie), specie, rank. **Niente nome allenatore nel riquadro.**
- Ricerca per nome/specie; filtro per allenatore. Clic → scheda.
- Nessuna divisione squadra/box.

### 10.8 Scheda Pokémon `/pokemon/[id]`

In gioco: HP (BaseHP + Vitality) e Will (Insight + 3) attuali/massimi con −/+; stati; penalità; Difesa/Dif. Speciale; Iniziativa.
Scheda:

- immagine (sprite o caricata), soprannome, genere (♂/♀/—, secondo `genderType`), specie (link), tipi, altezza/peso;
- allenatore (tendina tra i propri allenatori: sposta il Pokémon);
- rank (tendina con icone, modificabile a mano) + "Sali di rank → X" ed "Evolvi in X";
- natura (tendina con fiducia), abilità (tendina tra quelle della specie + nascosta, con ⓘ), strumento tenuto (testo libero);
- attributi (base bloccata, investiti, max specie, scala 10), sociali colorati, skill (§6.3);
- **"Evolvi in X"** (§6.7);
- mosse come **carte** (nome, categoria, tipo, precisione, danno, effetti, icona bersaglio — es. "All" se il bersaglio è tutti i nemici —, descrizione in corsivo, colore del tipo) con etichetta learnset/fuori/sopra rank e "Togli"; "Aggiungi mossa" con ricerca su tutte le 892, il learnset in cima con il rank;
- felicità e lealtà (0–5);
- note, riquadro avvisi, lucchetto, elimina.
  Creazione: dalla specie scelta, attributi = base, sociali = 1, abilità = prima, mosse = quelle Starter del learnset (max 4), genere a caso secondo `genderType`.

### 10.9 Fanmade `/fanmade`

- "Creati da te" (Visibile a tutti / Solo tu, Modifica) e "Del gruppo" (autore).
- Editor: nome; tipo 1/2; categoria; numero facoltativo; immagine (**caricamento file** o link https); descrizione; HP base; rank consigliato; leggendario; genere possibile; altezza/peso facoltativi; attributi base e massimo (base ≤ massimo, 0–10); abilità 1, 2, nascosta con suggerimenti dalle ufficiali **o nuove con effetto obbligatorio**; mosse per rank **solo ufficiali** (input con suggerimenti + Invio; nome non valido → errore); evoluzioni (specie di arrivo ufficiale o fanmade, metodo, velocità, strumento); "Visibile a tutti i giocatori del sito".
- Validazione lato server con zod (stessi messaggi in italiano). Dopo il salvataggio → scheda specie.

### 10.10 Campagne `/campagne`

- Le campagne di cui l'utente è master: nome, numero giocatori collegati. "Crea campagna" (nome, descrizione).

### 10.11 Dettaglio campagna `/campagne/[id]`

- Nome e descrizione (modificabili), **codice** con copia e "Rigenera".
- **Allenatori del master**: crea/modifica/elimina; ognuno con i suoi Pokémon (stesse schede §10.6/§10.8, stesse rotte, permessi del master). Visibili **solo al master**.
- **Giocatori collegati**: allenatori con i loro Pokémon, apertura in sola lettura, "Rimuovi dalla campagna".
- Su ogni Pokémon del master: **"Invia a…"** → scelta tra gli allenatori dei giocatori collegati → conferma → spostamento.
- Link a Generatore e Biomi.

### 10.12 Generatore e Biomi

Vedi §11.

---

## 11. Generatore e biomi

### 11.1 Biomi e tabella automatica

Codici e tipi di partenza (una specie entra se **almeno uno** dei suoi tipi è nella lista):

| Codice     | Nome               | Tipi                                  |
| ---------- | ------------------ | ------------------------------------- |
| forest     | Bosco              | Grass, Bug                            |
| grassland  | Prateria           | Normal, Grass, Fairy                  |
| cave       | Grotta             | Rock, Ground, Dark, Poison            |
| mountain   | Montagna           | Rock, Fighting, Steel, Dragon, Flying |
| snow       | Neve               | Ice                                   |
| sea        | Mare               | Water                                 |
| freshwater | Lago / Fiume       | Water                                 |
| swamp      | Palude             | Poison, Water, Ground                 |
| desert     | Deserto            | Ground, Fire                          |
| volcano    | Vulcano            | Fire, Rock                            |
| city       | Città              | Normal, Electric, Steel, Poison       |
| ruins      | Rovine / Spettrale | Ghost, Psychic, Dark                  |
| sky        | Cielo              | Flying, Dragon                        |

Escludi dalla tabella automatica le forme **Mega** (id contenente `mega-form`) e le forme che derivano da `Kind: Form`/`Mega` (si ottengono con l'evoluzione/strumento, non si incontrano). Specie della campagna = automatica + `campaign_biomes` (`add`/`remove`).

### 11.2 Rarità automatica

1. Stadio evolutivo: 1 se nessuna specie evolve in lei; 2 se evolve da una di stadio 1; 3 altrimenti.
2. Ha evoluzioni successive? (`to` presente).
3. Regola:
   - `legendary` → **leggendario** (solo se opzione attiva);
   - stadio 1 con evoluzioni e rank consigliato ≤ Standard → **comune**;
   - stadio 3, oppure rank consigliato ≥ Ace → **raro**;
   - altrimenti → **non comune**.
4. Override del master in `campaign_biomes.rarity`.
   Probabilità di estrazione per categoria: comune 60%, non comune 30%, raro 10% (se una categoria è vuota, ridistribuisci sulle altre); dentro la categoria uniforme.

### 11.3 Impostazioni

Bioma; rank minimo e massimo (rank del Pokémon estratto uniforme nell'intervallo); quantità 1–6; leggendari sì/no; fanmade sì/no (i fanmade visibili al master entrano per tipo come gli ufficiali, salvo correzioni); abilità nascosta possibile sì/no (se sì, 20% di probabilità).

### 11.4 Algoritmo (puro, RNG iniettabile per i test)

Per ogni Pokémon:

1. specie per rarità (§11.2);
2. rank nell'intervallo;
3. **attributi** = base specie; distribuisci a caso i punti attributo del rank (§6.1), un punto alla volta su attributi sotto il proprio massimo; se tutti al massimo, i punti avanzati si perdono;
4. **skill** = 0; distribuisci a caso i punti skill del rank sulle 12 skill del Pokémon, nessuna oltre il limite skill del rank;
5. **mosse**: dal learnset con rank ≤ rank del Pokémon, estrai senza ripetizione fino a Insight + 3 (Insight appena generato);
6. **abilità** a caso tra le normali (nascosta secondo opzione); **natura** a caso tra le 25; **genere** secondo `genderType`; **sociali** = 1 più i punti sociali del rank distribuiti a caso (max 5, +2 a Champion, §6.1); HP/Will pieni.
7. Gli attributi possono arrivare al massimo della specie + 2 a Champion (§6.2).

### 11.5 Risultato

Ogni Pokémon mostrato con la **stessa grafica della scheda** (§10.8, in sola lettura) e pulsanti:

- **Rigenera** (solo quello);
- **Salva** → scegli un allenatore del master nella campagna → crea il Pokémon;
- **Invia a…** → scegli un allenatore di giocatore collegato → crea il Pokémon direttamente lì.
  Il risultato non salvato vive solo nello stato del client.

### 11.6 Pagina Biomi

Elenco biomi; per ognuno le specie (sprite, nome, rarità effettiva). Il master può: aggiungere una specie (ricerca), toglierla, cambiarne la rarità, ripristinare l'automatico.

---

## 12. Immagini

- Dove: ritratto allenatore, immagine personalizzata Pokémon, immagine fanmade.
- Nel browser: ridimensiona a lato lungo **512 px**, converti in **WebP** qualità ~0.8 con `canvas` (`createImageBitmap` + `OffscreenCanvas`/`<canvas>`), rifiuta se dopo la compressione supera 300 KB. Formati accettati in ingresso: jpg, png, webp, gif (primo frame). Se il browser non sa produrre WebP (vecchi Safari) ripiega su JPEG (`.jpg`).
- Upload su **Vercel Blob** con `@vercel/blob` (`handleUpload` lato server con controllo di sessione e proprietà, `upload()` lato client). Percorso: `users/<userId>/<tipo>/<uuid>.webp`. Salva l'URL pubblico nel record.
- Alla sostituzione o eliminazione del record, elimina il vecchio blob.
- Fanmade: in alternativa al file, link https.

---

## 13. Server actions / API

Organizzate in `src/lib/actions/<dominio>.ts` con `"use server"`. Ogni azione: legge la sessione, verifica i permessi (§8), valida con zod, scrive, `revalidatePath` delle pagine coinvolte. Errori di validazione restituiti come `{ ok:false, error:"messaggio italiano" }`, mai eccezioni non gestite per errori dell'utente.

- **account**: `register`, `login`, `logout`
- **trainers**: `createTrainer`, `updateTrainer`, `deleteTrainer`, `setTrainerPlayState` (hp, will, statuses — salvataggio immediato), `joinCampaign(code)`, `leaveCampaign`
- **pokemon**: `createPokemon(trainerId, speciesId)`, `updatePokemon`, `deletePokemon`, `setPokemonPlayState`, `rankUp` (rank successivo), `evolvePokemon(toSpeciesId)` (usa `lib/evolution.ts`), `movePokemonToTrainer(trainerId)` (tra i propri)
- **fanmade**: `createFanmade`, `updateFanmade`, `deleteFanmade`
- **campaigns**: `createCampaign`, `updateCampaign`, `deleteCampaign`, `regenerateCode`, `removePlayer(trainerId)`, `createNpcTrainer`, `sendPokemonTo(pokemonId, playerTrainerId)`
- **generator**: `saveGenerated(campaignId, trainerId, generated)` (valida che il Pokémon sia coerente: specie esistente, rank valido), `sendGenerated(campaignId, playerTrainerId, generated)`
- **biomes**: `addToBiome`, `removeFromBiome`, `setRarity`, `resetBiome`
- **images**: route handler `/api/upload` per `handleUpload` di Vercel Blob

Dati di gioco: letti dal server con `import` dei JSON in `lib/data.ts` (marcato `import "server-only"`). Alle pagine client passa solo il necessario (es. per la ricerca: `{id, number, name, types, image, fanmade}`; per la ricerca mosse: nomi, tipo, categoria).

---

## 14. Problemi già incontrati (da non ripetere)

1. **Prisma** non installa i binari se `binaries.prisma.sh` è bloccato → usare **Drizzle**.
2. **TypeScript 7** installato di default da npm in alcuni casi → fissare **5.9.x**.
3. **Next 16**: `params` nelle pagine è una **Promise** (`const { id } = await params`).
4. **Tailwind 4**: le classi personalizzate (`.btn`, `.field`…) vanno dentro **`@layer components`**, altrimenti sovrascrivono le utility (`w-24`, `p-0`…) e rompono i layout su mobile.
5. **React 19 `useActionState`**: dopo l'invio il form si **resetta**; per non far riscrivere tutto all'utente restituisci i valori (`username`, `invite`) nello stato e usali come `defaultValue` (con `key` per forzare il re-render).
6. **Auth.js v5 beta**: `trustHost: true` su Vercel; l'id utente va copiato nel token (`jwt` callback) e nella sessione (`session` callback).
7. **Pool pg in dev**: riusa il pool su `globalThis` per evitare troppe connessioni con l'hot reload. Su Vercel usa l'URL **pooled** di Neon.
8. **JSON grandi**: `species.json` ~1,7 MB → importali solo lato server; al client passa versioni ridotte.
9. **Sprite**: alcuni mancano in HomeSprites → fallback BookSprites → segnaposto. Le immagini fanmade sono URL completi: non prefissarle.
10. **Componente immagine con stato** (`useState(src)`): quando cambia la sorgente (anteprima nell'editor) va resettato con `key={image}`.
11. **Fanmade privato già usato**: chi possiede un Pokémon di quella specie deve continuare a vederla nella propria scheda (risoluzione specie senza controllo di visibilità quando si apre un Pokémon proprio).
12. **Eliminazione fanmade** in uso → blocca con messaggio, non rompere le schede.
13. **Accessi altrui** → 404, verificato da test.
14. **Selettori dei test E2E**: Next aggiunge un `#__next-route-announcer__` con `role="alert"` → nei test usa selettori specifici per i propri messaggi.
15. **Font**: caricali con `next/font` (non `<link>` a Google Fonts) per evitare flash e richieste bloccanti.

---

## 15. Fasi di lavoro e criteri di accettazione

Ogni fase si chiude con: `typecheck`, `lint`, `test`, `test:e2e` (scenari della fase), `build` verdi, commit su `main` tramite PR (o commit diretto se lavori da solo), deploy di anteprima Vercel funzionante.

**Fase 0 — Setup**

- Repo GitHub `pokerole-tracker`, Next + TS + Tailwind + ESLint + Prettier, struttura §4, CI GitHub Actions (§16.3), `.env.example`, README.
- Script dati §5, `data/` generato e committato. Test: conteggi (1200/892/305/236/25), Mud Slap → 84 learners.
- Design importato in `design/`; token grafici (colori, font, spaziature) tradotti in `@theme` di Tailwind seguendo il design; tema chiaro/scuro.
- ✅ La home mostra la nav; `npm run build` passa.

**Fase 1 — Account e consultazione**

- Auth (§8), Pokédex (§10.1–10.2), Mosse (§10.3), Strumenti (§10.4).
- ✅ Registrazione con codice invito (errore se sbagliato, campi mantenuti), login, logout; ricerca e filtri funzionano su telefono; righe mosse espandibili; ⓘ abilità.

**Fase 2 — Schede**

- `lib/rules.ts`, `lib/warnings.ts`, `lib/evolution.ts` con test unitari.
- I miei allenatori, scheda allenatore, I miei Pokémon, scheda Pokémon (§10.5–10.8), lucchetto, parte in gioco con salvataggio immediato, riquadro avvisi, sali di rank, evolvi (regola B), mosse con etichette.
- ✅ Scenario E2E: crea allenatore Advanced → avvisi sui punti; aggiungi Barboach → Standard → Sali di rank → Advanced; danno −1 → ricarica → HP persistiti; evolvi in Whiscash → attributi secondo regola B; mossa fuori learnset → etichetta ⚠; altro utente → 404.

**Fase 3 — Fanmade**

- §10.9 con caricamento immagine (anche fase 6 se Blob non è pronto: intanto link).
- ✅ Crea Shakkin (Normal/Electric, Punk Rock + abilità nuova con effetto, mosse ufficiali) → appare nel Pokédex e in "Chi la impara" → aggiunto a un allenatore → visibile a un altro utente se condiviso, 404 se privato → eliminazione bloccata se in uso.

**Fase 4 — Campagne**

- §10.10–10.11, collegamento con codice dalla scheda allenatore, sola lettura del master, allenatori NPC, Invia a…
- ✅ Master crea campagna → giocatore inserisce codice → master vede la scheda in sola lettura (nessun controllo di modifica, azioni server rifiutate) → master crea NPC con un Pokémon → Invia a… → il Pokémon compare in I miei Pokémon del giocatore e sparisce dal master; gli NPC non sono visibili al giocatore.

**Fase 5 — Generatore e Biomi**

- `lib/biomes.ts`, `lib/generator.ts` con test (RNG fisso): punti spesi = punti del rank (salvo massimi), skill ≤ limite, mosse ≤ Insight + 3 e tutte del learnset a rank ≤.
- ✅ Genera 3 Pokémon "Bosco, Rookie–Standard" → schede coerenti → Salva su NPC → Invia a un giocatore; correzioni dei biomi applicate.

**Fase 6 — Immagini**

- §12. ✅ Carica ritratto da telefono (foto grande) → salvato < 300 KB → visibile; sostituzione elimina il vecchio blob.

**Fase 7 — Rifinitura**

- Accessibilità (tastiera, lettori di schermo base), prestazioni su telefono, stati vuoti con indicazioni ("Non hai ancora allenatori: creane uno"), pagine 404, messaggi d'errore chiari.

---

## 16. Test

### 16.1 Unitari (Vitest)

`rules`, `warnings`, `evolution`, `generator` (RNG seedato), `biomes` (stadi e rarità: Barboach comune, Whiscash non comune/raro secondo regole, Gyarados raro), parsing di `build-data`.

### 16.2 E2E (Playwright)

Scenari di §15 su viewport **390×844** (telefono) e 1280×800. Database di test dedicato (Postgres locale o container), svuotato prima di ogni suite. Fallisci il test se compaiono errori in console (`pageerror`).

### 16.3 CI (GitHub Actions, `.github/workflows/ci.yml`)

Su push e PR: Node 22, `npm ci`, `lint`, `typecheck`, `test`, servizio `postgres:16` per `db:migrate` + `test:e2e` (Chromium), `build`.

---

## 17. Deploy

1. Repository GitHub (privato) `pokerole-tracker`.
2. Vercel → New Project → importa il repo (Next rilevato da solo).
3. Vercel → Storage → **Neon Postgres** → collega al progetto (imposta `DATABASE_URL`).
4. Vercel → Storage → **Blob** → collega (imposta `BLOB_READ_WRITE_TOKEN`).
5. Variabili: `AUTH_SECRET`, `INVITE_CODE`.
6. Migrazioni: `vercel env pull .env.local` poi `npm run db:migrate` (oppure step di build `drizzle-kit migrate` prima di `next build`).
7. Ogni push su `main` → deploy di produzione; ogni PR → anteprima.

Aggiornare i dati di gioco:

```bash
git clone --depth 1 https://github.com/Pokerole-Software-Development/Pokerole-Data.git /tmp/Pokerole-Data
npm run data:build -- /tmp/Pokerole-Data/v3.0
git add data && git commit -m "Aggiorna dati Pokérole" && git push
```

---

## 18. Punti aperti da verificare

1. **Icone Ball** di Starter, Expert, Ace, Master, Champion (confermate solo Rookie = Poké Ball, Advanced = Ultra Ball; Standard = Great Ball dedotta).
2. **Regola di evoluzione B**: decisa, ma da confermare col master; è isolata in `lib/evolution.ts` per poterla cambiare facilmente.
3. **HP allenatore = Vitality + 4**: regola del gruppo.
4. **Tabella biomi e percentuali di rarità**: proposte, modificabili dal master.
5. Base URL degli sprite (§3.2): verificarne la risposta al primo avvio.

## 19. Fuori scope (deciso)

Calcolatore di debolezze/resistenze; mosse fanmade; strumenti fanmade; PNG del master visibili ai giocatori; diario/appunti di sessione; il master che modifica le schede dei giocatori; tiro dei dadi nell'app; divisione squadra/box.
