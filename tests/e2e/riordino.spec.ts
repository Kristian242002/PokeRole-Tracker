import type { Page } from "@playwright/test";
import { expect, test } from "./fixtures";
import { registerUser, uniqueUsername } from "./helpers";

const team = (page: Page) => page.getByTestId("team-member");
/** Il trascinamento è attivo solo dopo l'idratazione della pagina. */
const dragReady = (page: Page) =>
  expect(page.getByRole("list", { name: "Squadra" })).toHaveAttribute("data-ready", "true");
const names = async (page: Page) =>
  (await team(page).allTextContents()).map((t) => t.match(/^(Barboach|Pikachu|Bulbasaur)/)?.[1]);

test("riordino della squadra: il terzo al primo posto, l'ordine resta", async ({
  page,
}, testInfo) => {
  test.setTimeout(120_000);
  await registerUser(page, uniqueUsername(testInfo, "o"));
  await page.goto("/allenatori");
  await page.getByLabel("Nuovo allenatore").fill("Ash");
  await page.getByRole("button", { name: "Crea allenatore" }).click();
  await expect(page).toHaveURL(/\/allenatori\/[0-9a-f-]{36}$/);
  const trainerUrl = page.url();
  for (const species of ["Barboach", "Pikachu", "Bulbasaur"]) {
    await page.goto(trainerUrl);
    await dragReady(page);
    await page.getByRole("searchbox", { name: "Aggiungi Pokémon" }).fill(species);
    await page.getByRole("button", { name: new RegExp(`^${species}`) }).click();
    await expect(page).toHaveURL(/\/pokemon\/[0-9a-f-]{36}$/);
  }
  await page.goto(trainerUrl);
  expect(await names(page)).toEqual(["Barboach", "Pikachu", "Bulbasaur"]); // i nuovi in fondo

  // Da tastiera: spazio per prendere il terzo, freccia su, spazio per lasciarlo al primo posto.
  await dragReady(page);
  const saved = page.waitForResponse((r) => r.request().method() === "POST" && r.ok());
  await team(page).nth(2).getByRole("link").focus();
  const live = page.getByRole("status").filter({ hasText: /Bulbasaur/ });
  await page.keyboard.press("Space");
  await expect(live).toContainText("posizione 3 di 3");
  await page.keyboard.press("ArrowUp");
  await expect(live).toHaveText("Bulbasaur sopra la posizione 1 di 3 nella squadra.");
  await page.keyboard.press("Space");
  await saved;
  expect(await names(page)).toEqual(["Bulbasaur", "Barboach", "Pikachu"]);

  await page.reload();
  expect(await names(page)).toEqual(["Bulbasaur", "Barboach", "Pikachu"]);
  await page.goto("/pokemon/miei");
  const box = (
    await page.getByRole("link", { name: /Barboach|Pikachu|Bulbasaur/ }).allTextContents()
  ).map((t) => t.match(/(Barboach|Pikachu|Bulbasaur)/)?.[1]);
  expect(box).toEqual(["Bulbasaur", "Barboach", "Pikachu"]);

  // Col mouse (desktop): trascina il terzo sul primo; un clic semplice apre ancora la scheda.
  if (testInfo.project.name === "desktop") {
    await page.goto(trainerUrl);
    await dragReady(page);
    await page
      .getByRole("list", { name: "Squadra" })
      .evaluate((el) => el.scrollIntoView({ block: "center" }));
    const from = (await team(page).nth(2).boundingBox())!;
    const to = (await team(page).nth(0).boundingBox())!;
    const dragged = page.waitForResponse((r) => r.request().method() === "POST" && r.ok());
    await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
    await page.mouse.down();
    await page.mouse.move(from.x + from.width / 2 + 10, from.y + from.height / 2 - 10, {
      steps: 4,
    });
    // Il trascinamento è partito (annuncio per i lettori di schermo)?
    await expect(page.getByRole("status").filter({ hasText: /^Pikachu sopra/ })).toBeVisible();
    await page.mouse.move(to.x + to.width / 2, to.y + to.height / 2, { steps: 12 });
    await page.mouse.up();
    await dragged;
    await expect(page).toHaveURL(trainerUrl); // il trascinamento non apre la scheda
    expect(await names(page)).toEqual(["Pikachu", "Bulbasaur", "Barboach"]);
    await page.reload();
    expect(await names(page)).toEqual(["Pikachu", "Bulbasaur", "Barboach"]);
    await team(page).nth(0).getByRole("link").click();
    await expect(page).toHaveURL(/\/pokemon\/[0-9a-f-]{36}$/);
  }

  // A scheda bloccata il riordino è spento.
  await page.goto(trainerUrl);
  const locked = page.waitForResponse((r) => r.request().method() === "POST" && r.ok());
  await page.getByRole("button", { name: "Blocca le modifiche alla scheda" }).first().click();
  await locked;
  await expect(team(page).first().getByRole("link")).not.toHaveAttribute("aria-roledescription");
});
