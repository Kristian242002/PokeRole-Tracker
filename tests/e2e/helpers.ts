import type { Page, TestInfo } from "@playwright/test";
import { expect } from "./fixtures";
import { TEST_INVITE_CODE } from "./env";

let counter = 0;

/** Nome utente unico per progetto (telefono/desktop) ed esecuzione. */
export function uniqueUsername(testInfo: TestInfo, tag = "") {
  counter += 1;
  return `${testInfo.project.name.slice(0, 3)}${tag}_${Date.now().toString(36)}${counter}`.slice(
    0,
    24,
  );
}

/** Registra un nuovo utente e lo lascia loggato. */
export async function registerUser(page: Page, username: string, password = "password1") {
  await page.goto("/register");
  await page.getByLabel("Nome utente").fill(username);
  await page.getByLabel("Password").fill(password);
  await page.getByLabel("Codice invito").fill(TEST_INVITE_CODE);
  await page.getByRole("button", { name: "Crea account" }).click();
  await expect(page).toHaveURL(/\/pokemon\/miei$/);
}

/** Salva la scheda e attende la conferma. */
export async function saveSheet(page: Page) {
  await page.getByRole("button", { name: "Salva modifiche" }).click();
  await expect(page.getByTestId("save-status")).toHaveText("Salvato");
}
