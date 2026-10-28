import { expect, test } from "./fixtures";
import { registerUser, uniqueUsername } from "./helpers";

test("generatore e biomi: genera, salva su NPC, invia a un giocatore, correzioni", async ({
  page: master,
  browser,
}, testInfo) => {
  test.setTimeout(150_000);
  await registerUser(master, uniqueUsername(testInfo, "m"));

  // Campagna con un NPC e un giocatore collegato
  await master.goto("/campagne");
  await master.getByLabel("Nome", { exact: true }).fill("Bosco Antico");
  await master.getByRole("button", { name: "+ Crea campagna" }).click();
  await expect(master).toHaveURL(/\/campagne\/[0-9a-f-]{36}$/);
  const campaignUrl = master.url();
  const code = (await master.getByTestId("join-code").textContent())!.trim();
  await master.getByLabel("Nuovo allenatore della campagna").fill("Ranger Ivo");
  await master.getByRole("button", { name: "Crea allenatore" }).click();
  await expect(master).toHaveURL(/\/allenatori\/[0-9a-f-]{36}$/);

  const ctx = await browser.newContext({ viewport: master.viewportSize() ?? undefined });
  const player = await ctx.newPage();
  const playerName = uniqueUsername(testInfo, "p");
  await registerUser(player, playerName);
  await player.goto("/allenatori");
  await player.getByLabel("Nuovo allenatore").fill("Lea");
  await player.getByRole("button", { name: "Crea allenatore" }).click();
  await expect(player).toHaveURL(/\/allenatori\/[0-9a-f-]{36}$/);
  await player.getByRole("textbox", { name: "Codice campagna" }).fill(code);
  await player.getByRole("button", { name: "Collega" }).click();
  await expect(player.getByTestId("campaign-linked")).toBeVisible();

  // Generatore: Bosco, Rookie–Standard, 3 Pokémon
  await master.goto(campaignUrl);
  await master.getByRole("link", { name: /Generatore/ }).click();
  await expect(master).toHaveURL(/\/generatore$/);
  await master.getByLabel("Bioma").selectOption("forest");
  await master.getByLabel("Rank da").selectOption("Rookie");
  await master.getByLabel("Rank a").selectOption("Standard");
  await expect(master.locator('output[aria-label="Quantità"]')).toHaveText("3");
  await master.getByRole("button", { name: "Genera" }).click();
  const cards = master.getByRole("article");
  await expect(cards).toHaveCount(3);
  for (const card of await cards.all()) {
    await expect(card).toContainText(/Rookie|Standard/);
  }

  // Rigenera solo il primo
  await cards.first().getByRole("button", { name: "Rigenera" }).click();
  await expect(cards).toHaveCount(3);

  // Salva il primo sull'NPC → scheda coerente con le regole del rank
  const first = cards.first();
  await first.getByRole("button", { name: "Salva" }).click();
  await first.getByRole("button", { name: "Ranger Ivo" }).click();
  await expect(first.getByText("✓ Salvato su Ranger Ivo")).toBeVisible();
  await first.getByRole("link", { name: "Apri la scheda" }).click();
  await expect(master).toHaveURL(/\/pokemon\/[0-9a-f-]{36}$/);
  await expect(master.getByLabel("Rank")).toHaveValue(/Rookie|Standard/);
  const warnings = master.getByRole("status", { name: "Avvisi" });
  if (await warnings.count()) {
    const text = await warnings.textContent();
    expect(text).not.toMatch(
      /Ti mancano|oltre il limite|Conosce \d+ mosse|fuori dal learnset|sopra il rank attuale/,
    );
  }

  // Invia il secondo al giocatore → compare tra i suoi Pokémon
  await master.goBack();
  await master.getByLabel("Bioma").selectOption("forest");
  await master.getByRole("button", { name: "Genera" }).click();
  await expect(cards).toHaveCount(3);
  const second = cards.nth(1);
  const species = (await second.getAttribute("aria-label"))!.replace(" generato", "");
  await second.getByRole("button", { name: "Invia a…" }).click();
  await second.getByRole("button", { name: `Lea (@${playerName})` }).click();
  await expect(second.getByText("✓ Inviato a Lea")).toBeVisible();
  await player.goto("/pokemon/miei");
  await expect(player.getByRole("link", { name: new RegExp(species) }).first()).toBeVisible();

  // Biomi: correzioni del master
  await master.goto(campaignUrl);
  await master.getByRole("link", { name: /Biomi/ }).click();
  await expect(master).toHaveURL(/\/biomi$/);
  const lake = master.getByRole("region", { name: "Lago / Fiume" });
  await lake.getByRole("button", { name: /Lago \/ Fiume/ }).click();
  await lake.getByLabel("Cerca nel bioma").fill("barboach");
  const rarity = lake.getByRole("group", { name: "Rarità di Barboach" });
  await expect(rarity.getByRole("button", { name: "Comune", exact: true })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await rarity.getByRole("button", { name: "Raro" }).click();
  await expect(rarity.getByRole("button", { name: "Raro" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(lake.getByText("Rarità cambiata")).toBeVisible();

  await lake.getByRole("combobox", { name: "Aggiungi specie" }).fill("Pikachu");
  await lake.getByRole("combobox", { name: "Aggiungi specie" }).press("Enter");
  await lake.getByLabel("Cerca nel bioma").fill("pikachu");
  await expect(lake.getByText("Aggiunta da te")).toBeVisible();
  await lake.getByRole("button", { name: "Togli Pikachu da Lago / Fiume" }).click();
  await expect(lake.getByText("Nessuna specie.")).toBeVisible();

  await master.reload();
  await lake.getByRole("button", { name: /Lago \/ Fiume/ }).click();
  await expect(lake).toContainText("correzioni");
  master.once("dialog", (d) => d.accept());
  await lake.getByRole("button", { name: "Ripristina l'automatico" }).click();
  await lake.getByLabel("Cerca nel bioma").fill("barboach");
  await expect(
    lake
      .getByRole("group", { name: "Rarità di Barboach" })
      .getByRole("button", { name: "Comune", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");

  // Il giocatore non vede generatore e biomi
  expect((await player.goto(`${campaignUrl}/generatore`))?.status()).toBe(404);
  expect((await player.goto(`${campaignUrl}/biomi`))?.status()).toBe(404);
  await ctx.close();
});
