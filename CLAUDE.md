# Pokérole Tracker

- La specifica completa è in POKEROLE-TRACKER-BUILD.md: seguila.
- Il design è in design/: per l'aspetto grafico vince il design, per il comportamento vince la specifica.
- Sistema: Windows, PowerShell. Dati di gioco sorgente: ../Pokerole-Data/v3.0
- Database: Neon online, niente Postgres locale.
  - Sviluppo: DATABASE_URL in .env.local (branch "dev").
  - Test E2E: TEST_DATABASE_URL in .env.local (branch "test"): i test possono svuotarlo; non usare MAI il branch dev o main per i test.
  - CI su GitHub Actions: servizio postgres:16 come da specifica.
- Interfaccia in italiano, nomi di gioco in inglese.
- A fine fase: typecheck, lint, test, build verdi, poi commit e push.
