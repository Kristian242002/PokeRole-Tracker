import type { Page } from "@playwright/test";
import { expect, test } from "./fixtures";
import { registerUser, uniqueUsername } from "./helpers";

/** Clic che salva subito (HP, stati, lucchetto): attende la risposta del server. */
async function clickAndSave(page: Page, name: string) {
  const saved = page.waitForResponse((r) => r.request().method() === "POST" && r.ok());
  await page.getByRole("button", { name, exact: true }).first().click();
  await saved;
}

test("riposo: squadra a scheda bloccata e singolo Pokémon", async ({ page }, testInfo) => {
  test.setTimeout(120_000);
  await registerUser(page, uniqueUsername(testInfo, "r"));
  await page.goto("/allenatori");
  await page.getByLabel("Nuovo allenatore").fill("Ash");
  await page.getByRole("button", { name: "Crea allenatore" }).click();
  await expect(page).toHaveURL(/\/allenatori\/[0-9a-f-]{36}$/);
  const trainerUrl = page.url();

  // Un Pokémon ferito e addormentato (Barboach: HP 3 + Vitality 1 = 4)
  await page.getByRole("searchbox", { name: "Aggiungi Pokémon" }).fill("Barboach");
  await page.getByRole("button", { name: /^Barboach/ }).click();
  await expect(page).toHaveURL(/\/pokemon\/[0-9a-f-]{36}$/);
  const pokemonUrl = page.url();
  await clickAndSave(page, "Togli 1 HP");
  await clickAndSave(page, "Sleep");
  await expect(page.getByTestId("hp-value")).toHaveText("3 / 4");

  // Allenatore ferito e avvelenato, poi scheda bloccata (HP: Vitality 1 + 4 = 5)
  await page.goto(trainerUrl);
  await clickAndSave(page, "Togli 1 HP");
  await clickAndSave(page, "Poison");
  await clickAndSave(page, "Blocca le modifiche alla scheda");
  await expect(page.getByTestId("hp-value")).toHaveText("4 / 5");

  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "Riposo", exact: true }).click();
  await expect(page.getByRole("status").filter({ hasText: "Squadra riposata" })).toBeVisible();
  await expect(page.getByTestId("hp-value")).toHaveText("5 / 5");
  await expect(page.getByRole("button", { name: "Poison", exact: true })).toHaveAttribute(
    "aria-pressed",
    "false",
  );
  await expect(page.getByRole("region", { name: "I suoi Pokémon" })).toContainText("HP 4/4");

  await page.reload();
  await expect(page.getByTestId("hp-value")).toHaveText("5 / 5");
  await expect(page.getByRole("button", { name: "Poison", exact: true })).toHaveAttribute(
    "aria-pressed",
    "false",
  );
  await page.goto(pokemonUrl);
  await expect(page.getByTestId("hp-value")).toHaveText("4 / 4");
  await expect(page.getByRole("button", { name: "Sleep" })).toHaveAttribute(
    "aria-pressed",
    "false",
  );

  // "Riposa" solo su questo Pokémon
  await clickAndSave(page, "Togli 1 HP");
  await clickAndSave(page, "Burn 1°");
  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "Riposa", exact: true }).click();
  await expect(page.getByRole("status").filter({ hasText: "Pokémon riposato" })).toBeVisible();
  await page.reload();
  await expect(page.getByTestId("hp-value")).toHaveText("4 / 4");
  await expect(page.getByRole("button", { name: "Burn 1°" })).toHaveAttribute(
    "aria-pressed",
    "false",
  );
});
