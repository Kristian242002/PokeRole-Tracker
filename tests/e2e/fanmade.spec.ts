import { expect, test } from "./fixtures";
import { registerUser, uniqueUsername } from "./helpers";

test("fanmade: crea Shakkin, Pokédex, Chi la impara, allenatore, visibilità ed eliminazione", async ({
  page,
  browser,
}, testInfo) => {
  test.setTimeout(120_000);
  const author = uniqueUsername(testInfo, "f");
  // Nome unico: i fanmade condivisi degli altri test sono visibili e il nome non può ripetersi.
  const name = `Shakkin ${author.slice(-6)}`;
  await registerUser(page, author);

  await page.goto("/allenatori");
  await page.getByLabel("Nuovo allenatore").fill("Ash");
  await page.getByRole("button", { name: "Crea allenatore" }).click();
  await expect(page).toHaveURL(/\/allenatori\/[0-9a-f-]{36}$/);

  // Editor
  await page.goto("/fanmade");
  await page.getByRole("link", { name: "+ Crea un Pokémon fanmade" }).click();
  await expect(page).toHaveURL(/\/fanmade\/nuovo$/);
  await page.getByLabel("Nome", { exact: true }).fill(name);
  await page.getByLabel("Tipo 1").selectOption("Normal");
  await page.getByLabel("Tipo 2").selectOption("Electric");
  await page.getByLabel("Abilità 1").fill("Punk Rock");
  await page.getByLabel("Abilità 2 (facoltativa)").fill("Feedback Loop");
  await page
    .getByLabel("Effetto (obbligatorio)")
    .fill("Quando subisce una mossa sonora, guadagna 1 Special.");

  await page.getByRole("button", { name: "Aggiungi mossa a Starter" }).click();
  const moveInput = page.getByRole("combobox", { name: "Mossa da aggiungere a Starter" });
  await moveInput.fill("Thunder Shock");
  await moveInput.press("Enter");
  await moveInput.fill("Mossa Finta");
  await moveInput.press("Enter");
  await expect(
    page.getByRole("alert").filter({ hasText: "Nessuna mossa ufficiale" }),
  ).toBeVisible();
  await moveInput.fill("Growl");
  await moveInput.press("Enter");
  await page.getByRole("button", { name: "Fatto" }).click();
  await expect(page.getByRole("button", { name: "Togli Thunder Shock da Starter" })).toBeVisible();

  // Immagine: si inquadra nella finestra di ritaglio (nei test il Blob non è configurato)
  const png = await page.evaluate(() => {
    const c = document.createElement("canvas");
    c.width = 800;
    c.height = 400;
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = "#e9b500";
    ctx.fillRect(0, 0, 800, 400);
    return c.toDataURL("image/png").split(",")[1];
  });
  await page.locator('input[type="file"]').setInputFiles({
    name: "shakkin.png",
    mimeType: "image/png",
    buffer: Buffer.from(png, "base64"),
  });
  const cropper = page.getByRole("dialog", { name: "Inquadra l'immagine" });
  await expect(cropper).toBeVisible();
  await cropper.getByRole("slider", { name: "Zoom" }).fill("2");
  await cropper.getByRole("application").press("ArrowLeft");
  await cropper.getByRole("button", { name: "Usa immagine" }).click();
  await expect(cropper).toBeHidden();
  await expect(
    page.getByRole("alert").filter({ hasText: "Caricamento immagini non configurato" }),
  ).toBeVisible();

  await page.getByRole("button", { name: "Salva fanmade" }).click();
  await expect(page).toHaveURL(/\/dex\/fm-[0-9a-f-]{36}$/);
  const speciesUrl = page.url();
  await expect(page.getByRole("heading", { level: 1, name })).toBeVisible();
  await page.getByRole("button", { name: "Mostra effetto di Feedback Loop" }).click();
  await expect(page.getByText("guadagna 1 Special")).toBeVisible();

  // Pokédex e Chi la impara
  await page.goto("/dex");
  await page.getByRole("searchbox", { name: "Cerca nome o numero" }).fill(name);
  await expect(page.getByRole("link", { name: new RegExp(`^${name}`) })).toBeVisible();
  await page.goto("/mosse");
  await page.getByRole("searchbox", { name: "Cerca mossa" }).fill("thunder shock");
  await page.getByRole("button", { name: /Thunder Shock/ }).click();
  await expect(page.getByRole("link", { name: new RegExp(name) })).toBeVisible();

  // Aggiunto a un allenatore
  await page.goto(speciesUrl);
  await page.getByRole("button", { name: "Aggiungi a Ash" }).click();
  await expect(page).toHaveURL(/\/pokemon\/[0-9a-f-]{36}$/);
  const pokemonUrl = page.url();
  await expect(page.getByRole("link", { name, exact: true })).toBeVisible();

  // Un altro utente lo vede se condiviso
  const other = await browser.newContext({ viewport: page.viewportSize() ?? undefined });
  const otherPage = await other.newPage();
  await registerUser(otherPage, uniqueUsername(testInfo, "g"));
  await otherPage.goto("/fanmade");
  await otherPage.getByRole("button", { name: /^Del gruppo/ }).click();
  await expect(otherPage.getByText(`di ${author}`)).toBeVisible();
  expect((await otherPage.goto(speciesUrl))?.status()).toBe(200);
  await expect(otherPage.getByRole("heading", { level: 1, name })).toBeVisible();

  // Reso privato → 404 per l'altro, l'autore continua a vedere il suo Pokémon
  const fmId = speciesUrl.split("/dex/")[1];
  await page.goto(`/fanmade/${fmId}`);
  await page.getByRole("switch", { name: "Visibile a tutti i giocatori del sito" }).click();
  await page.getByRole("button", { name: "Salva fanmade" }).click();
  await expect(page).toHaveURL(speciesUrl);
  expect((await otherPage.goto(speciesUrl))?.status()).toBe(404);
  expect((await otherPage.goto(`/fanmade/${fmId}`))?.status()).toBe(404);
  await other.close();
  await page.goto(pokemonUrl);
  await expect(page.getByRole("link", { name, exact: true })).toBeVisible();

  // Eliminazione bloccata se in uso
  await page.goto(`/fanmade/${fmId}`);
  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "Elimina fanmade" }).click();
  await expect(page.getByTestId("fanmade-error")).toHaveText(
    "Non puoi eliminarlo: esiste 1 Pokémon di questa specie. Puoi renderlo privato.",
  );
});
