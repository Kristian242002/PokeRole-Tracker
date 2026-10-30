import type { Page } from "@playwright/test";
import { expect, test } from "./fixtures";
import { registerUser, uniqueUsername } from "./helpers";

const SPECIES = ["Pikachu", "Bulbasaur", "Charmander", "Squirtle", "Eevee", "Barboach", "Psyduck"];
const group = (page: Page, name: "Squadra" | "Box") =>
  page.getByRole("list", { name, exact: true }).getByTestId("team-member");
const names = async (page: Page, name: "Squadra" | "Box") =>
  (await group(page, name).allTextContents()).map((t) => SPECIES.find((s) => t.startsWith(s)) ?? t);
const posted = (page: Page) =>
  page.waitForResponse((r) => r.request().method() === "POST" && r.ok());

test("box: oltre 6 Pokémon si va nel box, l'anteprima mostra solo la squadra", async ({
  page,
}, testInfo) => {
  test.setTimeout(180_000);
  await registerUser(page, uniqueUsername(testInfo, "x"));
  await page.goto("/allenatori");
  await page.getByLabel("Nuovo allenatore").fill("Misty");
  await page.getByRole("button", { name: "Crea allenatore" }).click();
  await expect(page).toHaveURL(/\/allenatori\/[0-9a-f-]{36}$/);
  const trainerUrl = page.url();
  for (const species of SPECIES) {
    await page.goto(trainerUrl);
    await page.getByRole("searchbox", { name: "Aggiungi Pokémon" }).fill(species);
    await page.getByRole("button", { name: new RegExp(`^${species}`) }).click();
    await expect(page).toHaveURL(/\/pokemon\/[0-9a-f-]{36}$/);
  }

  // Il settimo va nel box.
  await page.goto(trainerUrl);
  expect(await names(page, "Squadra")).toEqual(SPECIES.slice(0, 6));
  expect(await names(page, "Box")).toEqual(["Psyduck"]);
  await expect(page.getByLabel("6 su 6")).toBeVisible();

  // Anteprima: solo gli sprite della squadra, il box contato.
  await page.goto("/allenatori");
  const card = page.getByRole("link", { name: /Misty/ });
  await expect(card).toContainText("6 in squadra · 1 nel box");
  await expect(card.locator("span.flex-wrap > span")).toHaveCount(6); // solo la squadra

  // Squadra piena: Psyduck non può entrare.
  await page.goto(trainerUrl);
  await group(page, "Box").first().getByRole("link").click();
  await expect(page).toHaveURL(/\/pokemon\/[0-9a-f-]{36}$/);
  await expect(page.getByLabel("Posto")).toHaveValue("box");
  await page.getByLabel("Posto").selectOption("team");
  await expect(page.getByText("La squadra è piena")).toBeVisible();
  await expect(page.getByLabel("Posto")).toHaveValue("box");

  // Pikachu nel box dalla sua scheda.
  await page.goto(trainerUrl);
  await group(page, "Squadra").first().getByRole("link").click();
  await expect(page).toHaveURL(/\/pokemon\/[0-9a-f-]{36}$/);
  const moved = posted(page);
  await page.getByLabel("Posto").selectOption("box");
  await moved;
  await page.goto(trainerUrl);
  expect(await names(page, "Squadra")).toEqual(SPECIES.slice(1, 6));
  expect(await names(page, "Box")).toEqual(["Psyduck", "Pikachu"]);

  // Col mouse (desktop): Psyduck dal box al primo posto della squadra.
  if (testInfo.project.name === "desktop") {
    await expect(page.getByRole("list", { name: "Squadra" })).toHaveAttribute("data-ready", "true");
    await page
      .getByRole("list", { name: "Box" })
      .evaluate((el) => el.scrollIntoView({ block: "center" }));
    const from = (await group(page, "Box").first().boundingBox())!;
    await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
    await page.mouse.down();
    await page.mouse.move(from.x + from.width / 2 + 10, from.y + from.height / 2 - 10, {
      steps: 4,
    });
    await expect(page.getByRole("status").filter({ hasText: /^Psyduck sopra/ })).toBeVisible();
    const to = (await group(page, "Squadra").first().boundingBox())!;
    const saved = posted(page);
    await page.mouse.move(to.x + to.width / 2, to.y + to.height / 2, { steps: 15 });
    await page.mouse.move(to.x + to.width / 2 - 5, to.y + to.height / 2, { steps: 3 });
    await page.mouse.up();
    await saved;
    await expect(page).toHaveURL(trainerUrl);
    await page.reload();
    expect(await names(page, "Squadra")).toEqual(["Psyduck", ...SPECIES.slice(1, 6)]);
    expect(await names(page, "Box")).toEqual(["Pikachu"]);
  }
});

test("box: trascinare nel box vuoto e di nuovo in squadra", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "trascinamento col mouse");
  test.setTimeout(120_000);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await registerUser(page, uniqueUsername(testInfo, "y"));
  await page.goto("/allenatori");
  await page.getByLabel("Nuovo allenatore").fill("Brock");
  await page.getByRole("button", { name: "Crea allenatore" }).click();
  await expect(page).toHaveURL(/\/allenatori\/[0-9a-f-]{36}$/);
  const trainerUrl = page.url();
  for (const species of SPECIES.slice(0, 3)) {
    await page.goto(trainerUrl);
    await page.getByRole("searchbox", { name: "Aggiungi Pokémon" }).fill(species);
    await page.getByRole("button", { name: new RegExp(`^${species}`) }).click();
    await expect(page).toHaveURL(/\/pokemon\/[0-9a-f-]{36}$/);
  }
  await page.goto(trainerUrl);
  await expect(page.getByRole("list", { name: "Squadra" })).toHaveAttribute("data-ready", "true");

  const drag = async (from: { x: number; y: number }, to: { x: number; y: number }) => {
    await page.mouse.move(from.x, from.y);
    await page.mouse.down();
    await page.mouse.move(from.x + 10, from.y + 10, { steps: 4 });
    await page.mouse.move(to.x, to.y, { steps: 20 });
    await page.mouse.move(to.x + 4, to.y + 4, { steps: 10 });
    await page.mouse.up();
  };
  const center = (b: { x: number; y: number; width: number; height: number }) => ({
    x: b.x + b.width / 2,
    y: b.y + b.height / 2,
  });

  // Nel box vuoto.
  await page
    .getByRole("list", { name: "Box" })
    .evaluate((el) => el.scrollIntoView({ block: "center" }));
  const first = center((await group(page, "Squadra").first().boundingBox())!);
  const emptyBox = center((await page.getByRole("list", { name: "Box" }).boundingBox())!);
  let saved = posted(page);
  await drag(first, emptyBox);
  await saved;
  expect(errors).toEqual([]);
  await page.reload();
  expect(await names(page, "Squadra")).toEqual(["Bulbasaur", "Charmander"]);
  expect(await names(page, "Box")).toEqual(["Pikachu"]);

  // Di nuovo in squadra, in fondo.
  await expect(page.getByRole("list", { name: "Squadra" })).toHaveAttribute("data-ready", "true");
  await page
    .getByRole("list", { name: "Box" })
    .evaluate((el) => el.scrollIntoView({ block: "center" }));
  const boxed = center((await group(page, "Box").first().boundingBox())!);
  const last = center((await group(page, "Squadra").last().boundingBox())!);
  saved = posted(page);
  await drag(boxed, last);
  await saved;
  expect(errors).toEqual([]);
  await page.reload();
  expect(await names(page, "Box")).toEqual([]);
  expect(errors).toEqual([]);
});
