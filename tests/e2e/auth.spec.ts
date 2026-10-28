import type { Page, TestInfo } from "@playwright/test";
import { expect, test } from "./fixtures";
import { TEST_INVITE_CODE } from "./env";

function uniqueUsername(testInfo: TestInfo) {
  return `${testInfo.project.name.slice(0, 3)}_${Date.now().toString(36)}`;
}

const authError = (page: Page) => page.locator("#auth-error");

async function logout(page: Page, testInfo: TestInfo, username: string) {
  if (testInfo.project.name === "telefono") {
    await page.goto("/altro");
  }
  await page.getByRole("button", { name: `Esci (${username})` }).click();
  await expect(page).toHaveURL(/\/login$/);
}

test("registrazione con codice invito, login e logout", async ({ page }, testInfo) => {
  const username = uniqueUsername(testInfo);
  const password = "pikachu123";

  await page.goto("/login");
  await page.getByRole("link", { name: "Registrati" }).click();
  await expect(page).toHaveURL(/\/register$/);

  // Codice sbagliato: errore, nome utente e codice restano compilati.
  await page.getByLabel("Nome utente").fill(username);
  await page.getByLabel("Password").fill(password);
  await page.getByLabel("Codice invito").fill("SBAGLIATO");
  await page.getByRole("button", { name: "Crea account" }).click();
  await expect(authError(page)).toHaveText("Codice invito non valido");
  await expect(page.getByLabel("Nome utente")).toHaveValue(username);
  await expect(page.getByLabel("Codice invito")).toHaveValue("SBAGLIATO");

  // Codice giusto: account creato e accesso fatto.
  await page.getByLabel("Password").fill(password);
  await page.getByLabel("Codice invito").fill(TEST_INVITE_CODE.toLowerCase());
  await page.getByRole("button", { name: "Crea account" }).click();
  await expect(page).toHaveURL(/\/pokemon\/miei$/);

  await logout(page, testInfo, username);

  // Password sbagliata: errore, il nome utente resta.
  await page.getByLabel("Nome utente").fill(username);
  await page.getByLabel("Password").fill("sbagliata");
  await page.getByRole("button", { name: "Entra" }).click();
  await expect(authError(page)).toHaveText("Nome utente o password non corretti");
  await expect(page.getByLabel("Nome utente")).toHaveValue(username);

  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Entra" }).click();
  await expect(page).toHaveURL(/\/pokemon\/miei$/);

  // Da loggato, /login rimanda all'app.
  await page.goto("/login");
  await expect(page).toHaveURL(/\/pokemon\/miei$/);
});

test("nome utente già in uso", async ({ page }, testInfo) => {
  const username = uniqueUsername(testInfo) + "d";
  for (const attempt of [1, 2]) {
    await page.goto("/register");
    await page.getByLabel("Nome utente").fill(username);
    await page.getByLabel("Password").fill("password1");
    await page.getByLabel("Codice invito").fill(TEST_INVITE_CODE);
    await page.getByRole("button", { name: "Crea account" }).click();
    if (attempt === 1) {
      await expect(page).toHaveURL(/\/pokemon\/miei$/);
      await page.context().clearCookies();
    } else {
      await expect(authError(page)).toHaveText("Questo nome utente è già in uso");
    }
  }
});
