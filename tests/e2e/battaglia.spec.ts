import type { Page } from "@playwright/test";
import { expect, test } from "./fixtures";
import { registerUser, uniqueUsername } from "./helpers";

const NAMES = ["Pikachu", "Bulbasaur", "Charmander", "Mewtwo selvatico"];
const names = async (page: Page, testId: "combatant" | "knocked-out") =>
  (await page.getByTestId(testId).allTextContents()).map(
    (t) => NAMES.find((n) => t.includes(n)) ?? t,
  );
const order = (page: Page) => names(page, "combatant");
const knockedOut = (page: Page) => names(page, "knocked-out");
const saved = (page: Page) => expect(page.getByTestId("battle-save")).toHaveText("Salvato");

test("battaglia: iniziativa, ordine e zona KO", async ({ page }, testInfo) => {
  test.setTimeout(150_000);
  await registerUser(page, uniqueUsername(testInfo, "b"));
  await page.goto("/campagne");
  await page.getByLabel("Nome", { exact: true }).fill("Arena");
  await page.getByRole("button", { name: "+ Crea campagna" }).click();
  await expect(page).toHaveURL(/\/campagne\/[0-9a-f-]{36}$/);
  const campaignUrl = page.url();
  await page.getByLabel("Nuovo allenatore della campagna").fill("Ivo");
  await page.getByRole("button", { name: "Crea allenatore" }).click();
  await expect(page).toHaveURL(/\/allenatori\/[0-9a-f-]{36}$/);
  const npcUrl = page.url();
  for (const species of ["Pikachu", "Bulbasaur", "Charmander"]) {
    await page.goto(npcUrl);
    await page.getByRole("searchbox", { name: "Aggiungi Pokémon" }).fill(species);
    await page.getByRole("button", { name: new RegExp(`^${species}`) }).click();
    await expect(page).toHaveURL(/\/pokemon\/[0-9a-f-]{36}$/);
  }

  // Dalla campagna alla battaglia: si scelgono i partecipanti.
  await page.goto(campaignUrl);
  await page.getByRole("link", { name: /Battaglia/ }).click();
  await expect(page).toHaveURL(/\/battaglia$/);
  const battleUrl = page.url();
  await page.getByRole("button", { name: "Tutti" }).click();
  await page.getByLabel("Senza scheda (es. un selvatico)").fill("Mewtwo selvatico");
  await page.getByRole("button", { name: "Metti in lista" }).click();
  await page.getByRole("button", { name: "Inizia battaglia (4)" }).click();
  await expect(page.getByTestId("combatant")).toHaveCount(4);
  await saved(page);
  // Niente turni né round.
  await expect(page.getByRole("button", { name: "Avanti" })).toHaveCount(0);
  await expect(page.getByText(/Round/)).toHaveCount(0);

  // Iniziative scritte dal master, poi ordina.
  const initiatives = { Pikachu: 9, Bulbasaur: 4, Charmander: 12, "Mewtwo selvatico": 7 };
  for (const [name, value] of Object.entries(initiatives)) {
    await page.getByLabel(`Iniziativa di ${name}`).fill(String(value));
  }
  await saved(page);
  await page.getByRole("button", { name: "Ordina per iniziativa" }).click();
  expect(await order(page)).toEqual(["Charmander", "Pikachu", "Mewtwo selvatico", "Bulbasaur"]);

  // KO: esce subito dall'ordine e va nella zona KO; l'ordinamento non lo tocca.
  await page.getByRole("button", { name: "Mewtwo selvatico KO" }).click();
  expect(await order(page)).toEqual(["Charmander", "Pikachu", "Bulbasaur"]);
  expect(await knockedOut(page)).toEqual(["Mewtwo selvatico"]);
  await page.getByLabel("Iniziativa di Bulbasaur").fill("20");
  await saved(page);
  await page.getByRole("button", { name: "Ordina per iniziativa" }).click();
  expect(await order(page)).toEqual(["Bulbasaur", "Charmander", "Pikachu"]);
  expect(await knockedOut(page)).toEqual(["Mewtwo selvatico"]);

  // A mano (tastiera): Pikachu sopra Charmander.
  await expect(page.getByRole("list", { name: "Ordine di iniziativa" })).toHaveAttribute(
    "data-ready",
    "true",
  );
  await page.getByRole("button", { name: "Sposta Pikachu" }).focus();
  const live = page.getByRole("status").filter({ hasText: /Pikachu/ });
  await page.keyboard.press("Space");
  await expect(live).toContainText("posizione 3 di 3");
  await page.keyboard.press("ArrowUp");
  await expect(live).toHaveText("Pikachu sopra la posizione 2 di 3.");
  await page.keyboard.press("Space");
  expect(await order(page)).toEqual(["Bulbasaur", "Pikachu", "Charmander"]);
  await saved(page);

  // Dopo la ricarica è tutto com'era.
  await page.reload();
  expect(await order(page)).toEqual(["Bulbasaur", "Pikachu", "Charmander"]);
  expect(await knockedOut(page)).toEqual(["Mewtwo selvatico"]);
  await expect(page.getByLabel("Iniziativa di Charmander")).toHaveValue("12");

  // Rientra: torna in fondo all'ordine.
  await page.getByRole("button", { name: "Mewtwo selvatico rientra" }).click();
  expect(await order(page)).toEqual(["Bulbasaur", "Pikachu", "Charmander", "Mewtwo selvatico"]);
  await expect(page.getByRole("heading", { name: "KO" })).toHaveCount(0);

  // Togli e fine battaglia.
  await page.getByRole("button", { name: "Togli Mewtwo selvatico dalla battaglia" }).click();
  await expect(page.getByTestId("combatant")).toHaveCount(3);
  await saved(page);
  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "Fine battaglia" }).click();
  await expect(page.getByRole("heading", { name: "Chi combatte?" })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("heading", { name: "Chi combatte?" })).toBeVisible();
  await expect(page).toHaveURL(battleUrl);
});

test("battaglia: solo il master", async ({ page, browser }, testInfo) => {
  await registerUser(page, uniqueUsername(testInfo, "c"));
  await page.goto("/campagne");
  await page.getByLabel("Nome", { exact: true }).fill("Segreta");
  await page.getByRole("button", { name: "+ Crea campagna" }).click();
  await expect(page).toHaveURL(/\/campagne\/[0-9a-f-]{36}$/);
  const battleUrl = `${page.url()}/battaglia`;

  const ctx = await browser.newContext();
  const other = await ctx.newPage();
  await registerUser(other, uniqueUsername(testInfo, "d"));
  const response = await other.goto(battleUrl);
  expect(response?.status()).toBe(404);
  await ctx.close();
});
