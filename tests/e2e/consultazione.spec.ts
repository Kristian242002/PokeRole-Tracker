import { expect, test } from "./fixtures";

test("Pokédex: ricerca, filtri, scheda specie con abilità e mosse", async ({ page }) => {
  await page.goto("/dex");
  await expect(page.getByRole("heading", { level: 1, name: "Pokédex" })).toBeVisible();
  await expect(page.getByRole("button", { name: /Mostra altri/ })).toBeVisible();

  const search = page.getByRole("searchbox", { name: "Cerca nome o numero" });
  await search.fill("339");
  await expect(page.getByRole("link", { name: /^Barboach/ })).toBeVisible();
  await search.fill("barbo");
  await expect(page.getByRole("link", { name: /^Barboach/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /^Whiscash/ })).toBeHidden();

  // Filtro tipo: Barboach (Water/Ground) resta con Ground, sparisce con Fire.
  await page
    .getByRole("group", { name: "Filtra per tipo" })
    .getByRole("button", { name: "Fire" })
    .click();
  await expect(page.getByText(/^Nessuna specie trovata/)).toBeVisible();
  await page
    .getByRole("group", { name: "Filtra per tipo" })
    .getByRole("button", { name: "Ground" })
    .click();
  await page.getByRole("link", { name: /^Barboach/ }).click();

  await expect(page).toHaveURL(/\/dex\/barboach$/);
  await expect(page.getByRole("heading", { level: 1, name: "Barboach" })).toBeVisible();
  await expect(page.getByText("Whiskers Pokémon")).toBeVisible();

  // ⓘ dell'abilità
  const info = page.getByRole("button", { name: "Mostra effetto di Hydration" });
  await expect(info).toHaveAttribute("aria-expanded", "false");
  await info.click();
  await expect(info).toHaveAttribute("aria-expanded", "true");
  await expect(page.locator(".info-box")).toBeVisible();

  // Riga mossa espandibile
  const move = page.getByRole("button", { name: /Mud Slap/ });
  await move.click();
  await expect(move).toHaveAttribute("aria-expanded", "true");
  await expect(page.getByText("Bersaglio").first()).toBeVisible();

  // Evoluzione con link
  await page.getByRole("link", { name: "Whiscash" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Whiscash" })).toBeVisible();
});

test("specie inesistente → 404", async ({ page }) => {
  const res = await page.goto("/dex/non-esiste");
  expect(res?.status()).toBe(404);
});

test("Mosse: ricerca, filtri e Chi la impara", async ({ page }) => {
  await page.goto("/mosse");
  await page.getByRole("searchbox", { name: "Cerca mossa" }).fill("mud slap");
  const row = page.getByRole("button", { name: /Mud Slap/ });
  await expect(row).toHaveCount(1);
  await expect(row).toContainText("A: DEX + CHN");
  await row.click();
  await expect(page.getByText("Chi la impara (84)")).toBeVisible();
  await expect(page.getByRole("link", { name: /Barboach/ })).toBeVisible();

  await page
    .getByRole("group", { name: "Filtra per categoria" })
    .getByRole("button", { name: "Fisica" })
    .click();
  await expect(page.getByText(/^Nessuna mossa trovata/)).toBeVisible();
});

test("Strumenti: ricerca, tasca e dettagli", async ({ page }) => {
  await page.goto("/strumenti");
  await page
    .getByRole("group", { name: "Filtra per tasca" })
    .getByRole("button", { name: "Medicine" })
    .click();
  await page.getByRole("searchbox", { name: "Cerca strumento" }).fill("antidote");
  const row = page.getByRole("button", { name: /Antidote/ });
  await expect(row).toContainText("100 ₽");
  await row.click();
  await expect(page.getByText("Stati curati")).toBeVisible();
  await expect(page.getByText("Poison", { exact: true })).toBeVisible();
});
