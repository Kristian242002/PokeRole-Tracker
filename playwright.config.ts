import { defineConfig, devices } from "@playwright/test";
import { TEST_INVITE_CODE, testDatabaseUrl } from "./tests/e2e/env";

const PORT = 3100;

export default defineConfig({
  testDir: "tests/e2e",
  globalSetup: "./tests/e2e/global-setup.ts",
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "telefono",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 390, height: 844 },
        isMobile: true,
        hasTouch: true,
      },
    },
    {
      name: "desktop",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 800 } },
    },
  ],
  webServer: {
    // Porta dedicata: non si riusa mai un server di sviluppo collegato al database dev.
    // In CI la build è già fatta; in locale si fa una build separata (.next-e2e) che non
    // disturba un eventuale `next dev` aperto.
    command: process.env.CI
      ? `npm run start -- -p ${PORT}`
      : `npm run build && npm run start -- -p ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: false,
    timeout: 300_000,
    // I test usano SOLO il database di test, che viene svuotato (vedi tests/e2e/env.ts).
    env: {
      DATABASE_URL: testDatabaseUrl(),
      INVITE_CODE: TEST_INVITE_CODE,
      // Niente caricamenti veri su Vercel Blob dai test.
      BLOB_READ_WRITE_TOKEN: "",
      ...(process.env.CI ? {} : { NEXT_DIST_DIR: ".next-e2e" }),
    },
  },
});
