import { expect, test } from "./fixtures";
import { registerUser, uniqueUsername } from "./helpers";

test("campagne: codice, sola lettura del master, NPC e Invia a…", async ({
  page: master,
  browser,
}, testInfo) => {
  test.setTimeout(120_000);
  const masterName = uniqueUsername(testInfo, "m");
  await registerUser(master, masterName);

  // Il master crea la campagna
  await master.goto("/campagne");
  await master.getByLabel("Nome", { exact: true }).fill("Lago Fosco");
  await master.getByLabel("Descrizione (facoltativa)").fill("Campagna di prova");
  await master.getByRole("button", { name: "+ Crea campagna" }).click();
  await expect(master).toHaveURL(/\/campagne\/[0-9a-f-]{36}$/);
  const campaignUrl = master.url();
  const code = (await master.getByTestId("join-code").textContent())!.trim();
  expect(code).toMatch(/^[A-HJ-NP-Z2-9]{6}$/);

  // Il giocatore collega il suo allenatore con il codice
  const ctx = await browser.newContext({ viewport: master.viewportSize() ?? undefined });
  const player = await ctx.newPage();
  const playerName = uniqueUsername(testInfo, "p");
  await registerUser(player, playerName);
  await player.goto("/allenatori");
  await player.getByLabel("Nuovo allenatore").fill("Misty");
  await player.getByRole("button", { name: "Crea allenatore" }).click();
  await expect(player).toHaveURL(/\/allenatori\/[0-9a-f-]{36}$/);
  const playerTrainerUrl = player.url();
  const codeField = player.getByRole("textbox", { name: "Codice campagna" });
  await codeField.fill("ZZZZZZ");
  await player.getByRole("button", { name: "Collega" }).click();
  await expect(player.getByRole("alert").filter({ hasText: "Nessuna campagna" })).toBeVisible();
  await codeField.fill(code.toLowerCase());
  await player.getByRole("button", { name: "Collega" }).click();
  await expect(player.getByTestId("campaign-linked")).toContainText(
    `Collegato a Lago Fosco · master @${masterName}`,
  );

  // Il master vede la scheda del giocatore in sola lettura
  await master.reload();
  const players = master.getByRole("region", { name: "Giocatori collegati" });
  await expect(players).toContainText(`@${playerName}`);
  await players.getByRole("link", { name: "Vedi scheda di Misty" }).click();
  await expect(master).toHaveURL(playerTrainerUrl);
  await expect(master.getByText("Sola lettura").filter({ visible: true }).first()).toBeVisible();
  await expect(master.getByLabel("Nome", { exact: true })).toBeDisabled();
  await expect(master.getByRole("button", { name: "Salva modifiche" })).toHaveCount(0);
  await expect(master.getByRole("button", { name: "Togli 1 HP" })).toHaveCount(0);
  await expect(master.getByRole("button", { name: "Riposo", exact: true })).toHaveCount(0);
  await expect(master.getByRole("button", { name: "Elimina allenatore" })).toHaveCount(0);

  // Il master crea un NPC con un Pokémon
  await master.goto(campaignUrl);
  await master.getByLabel("Nuovo allenatore della campagna").fill("Capopalestra Ivo");
  await master.getByRole("button", { name: "Crea allenatore" }).click();
  await expect(master).toHaveURL(/\/allenatori\/[0-9a-f-]{36}$/);
  const npcUrl = master.url();
  await expect(master.getByText("Allenatore del master in")).toBeVisible();
  await master.getByRole("searchbox", { name: "Aggiungi Pokémon" }).fill("Barboach");
  await master.getByRole("button", { name: /^Barboach/ }).click();
  await expect(master).toHaveURL(/\/pokemon\/[0-9a-f-]{36}$/);
  const pokemonUrl = master.url();

  // Gli NPC non sono visibili al giocatore
  expect((await player.goto(npcUrl))?.status()).toBe(404);
  expect((await player.goto(pokemonUrl))?.status()).toBe(404);
  expect((await player.goto(campaignUrl))?.status()).toBe(404);
  await player.goto("/allenatori");
  await expect(player.getByText("Capopalestra Ivo")).toHaveCount(0);

  // Invia a… → il Pokémon passa al giocatore
  await master.goto(campaignUrl);
  await master.getByRole("button", { name: "Invia Barboach a…" }).click();
  master.once("dialog", (d) => d.accept());
  await master
    .getByRole("group", { name: "A chi inviare Barboach" })
    .getByRole("button", { name: `Misty (@${playerName})` })
    .click();
  await expect(master.getByRole("button", { name: "Invia Barboach a…" })).toHaveCount(0);
  await expect(players).toContainText("Barboach");

  await player.goto("/pokemon/miei");
  await expect(player.getByRole("link", { name: /Barboach/ })).toBeVisible();
  expect((await player.goto(pokemonUrl))?.status()).toBe(200);
  await expect(player.getByRole("button", { name: "Salva modifiche" })).toBeVisible();

  // Rimosso dalla campagna → il master non lo vede più
  await master.goto(campaignUrl);
  master.once("dialog", (d) => d.accept());
  await players.getByRole("button", { name: "Rimuovi dalla campagna" }).click();
  await expect(players).toContainText("Nessun giocatore");
  expect((await master.goto(playerTrainerUrl))?.status()).toBe(404);
  await ctx.close();
});
