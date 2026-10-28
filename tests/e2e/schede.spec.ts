import { expect, test } from "./fixtures";
import { registerUser, saveSheet, uniqueUsername } from "./helpers";

test("schede: allenatore, Pokémon, rank up, HP, evoluzione, mosse e accessi", async ({
  page,
  browser,
}, testInfo) => {
  test.setTimeout(120_000);
  await registerUser(page, uniqueUsername(testInfo));

  // Crea un allenatore Advanced → avvisi sui punti da spendere
  await page.goto("/allenatori");
  await page.getByLabel("Nuovo allenatore").fill("Ash");
  await page.getByRole("button", { name: "Crea allenatore" }).click();
  await expect(page).toHaveURL(/\/allenatori\/[0-9a-f-]{36}$/);
  const trainerUrl = page.url();
  await page.getByLabel("Rank").selectOption("Advanced");
  const warnings = page.getByRole("status", { name: "Avvisi" });
  await expect(warnings).toContainText("Ti mancano da spendere 6 punti attributo");
  await expect(warnings).toContainText("Ti mancano da spendere 17 punti skill");
  await saveSheet(page);

  // Aggiungi Barboach dalla scheda allenatore
  await page.getByRole("searchbox", { name: "Aggiungi Pokémon" }).fill("Barboach");
  await page.getByRole("button", { name: /^Barboach/ }).click();
  await expect(page).toHaveURL(/\/pokemon\/[0-9a-f-]{36}$/);
  const pokemonUrl = page.url();
  await expect(page.getByRole("link", { name: "Barboach" })).toBeVisible();

  // Standard → Sali di rank → Advanced
  await page.getByLabel("Rank").selectOption("Standard");
  await page.getByRole("button", { name: "Sali di rank → Advanced" }).click();
  await expect(page.getByLabel("Rank")).toHaveValue("Advanced");
  await expect(page.getByRole("status", { name: "Avvisi" })).toContainText(
    "Rank Standard → Advanced",
  );

  // Il riquadro avvisi si chiude e si riapre dal contatore in basso
  await page.getByRole("button", { name: "Chiudi gli avvisi" }).click();
  await expect(page.getByRole("status", { name: "Avvisi" })).toHaveCount(0);
  await page.getByRole("link", { name: /da controllare$/ }).click();
  await expect(page.getByRole("status", { name: "Avvisi" })).toBeVisible();

  // Danno −1 → ricarica → HP persistiti (Barboach: HP base 3 + Vitality 1 = 4)
  await expect(page.getByTestId("hp-value")).toContainText("4");
  const saved = page.waitForResponse((r) => r.request().method() === "POST" && r.ok());
  await page.getByRole("button", { name: "Togli 1 HP" }).click();
  await saved;
  await page.reload();
  await expect(page.getByTestId("hp-value")).toHaveText("3 / 4");

  // Strength 3 (base 2), poi evolvi in Whiscash: regola B
  await page.getByRole("button", { name: "Strength: imposta a 3" }).click();
  await saveSheet(page);
  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "Evolvi in Whiscash" }).click();
  await expect(page.getByRole("link", { name: "Whiscash" })).toBeVisible();
  await expect(page.getByRole("status", { name: "Avvisi" })).toContainText(
    "Evoluto da Barboach a Whiscash",
  );
  const attributes = page.getByRole("region", { name: "Attributi", exact: true });
  await expect(attributes.getByText("3 / 5")).toHaveCount(1); // Strength: min(5, 2 + 1)
  await expect(page.getByRole("button", { name: "Insight: imposta a 2" })).toHaveAttribute(
    "aria-pressed",
    "true",
  ); // Insight: base Whiscash 2
  await expect(page.getByTestId("hp-value")).toHaveText("3 / 8"); // HP restano 3, massimo 6 + 2

  // Mossa fuori learnset → etichetta ⚠
  const addMove = page.getByRole("searchbox", { name: "Aggiungi mossa" });
  await addMove.fill("Thunder Shock");
  await addMove.press("Enter");
  await expect(
    page.getByRole("button", { name: /Thunder Shock/ }).getByText("⚠ fuori learnset"),
  ).toBeVisible();
  await saveSheet(page);
  await page.reload();
  await expect(
    page.getByRole("button", { name: /Thunder Shock/ }).getByText("⚠ fuori learnset"),
  ).toBeVisible();

  // I miei Pokémon mostra Whiscash
  await page.goto("/pokemon/miei");
  await expect(page.getByRole("link", { name: /Whiscash/ })).toBeVisible();

  // Un altro utente → 404
  const other = await browser.newContext({ viewport: page.viewportSize() ?? undefined });
  const otherPage = await other.newPage();
  await registerUser(otherPage, uniqueUsername(testInfo, "b"));
  expect((await otherPage.goto(pokemonUrl))?.status()).toBe(404);
  expect((await otherPage.goto(trainerUrl))?.status()).toBe(404);
  await other.close();
});

test("lucchetto: blocca la scheda ma non HP e stati", async ({ page }, testInfo) => {
  await registerUser(page, uniqueUsername(testInfo, "l"));
  await page.goto("/allenatori");
  await page.getByLabel("Nuovo allenatore").fill("Misty");
  await page.getByRole("button", { name: "Crea allenatore" }).click();
  await expect(page).toHaveURL(/\/allenatori\/[0-9a-f-]{36}$/);

  const lock = page.getByRole("button", { name: "Blocca le modifiche alla scheda" }).first();
  const lockSaved = page.waitForResponse((r) => r.request().method() === "POST" && r.ok());
  await lock.click();
  await lockSaved;
  await expect(page.getByLabel("Nome", { exact: true })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Strength: imposta a 3" })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Togli 1 HP" })).toBeEnabled();
  const statusSaved = page.waitForResponse((r) => r.request().method() === "POST" && r.ok());
  await page.getByRole("button", { name: "Sleep" }).click();
  await expect(page.getByRole("button", { name: "Sleep" })).toHaveAttribute("aria-pressed", "true");
  await statusSaved;

  await page.reload();
  await expect(page.getByLabel("Nome", { exact: true })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Sleep" })).toHaveAttribute("aria-pressed", "true");
});
