import AxeBuilder from "@axe-core/playwright";
import type { Page } from "@playwright/test";
import { expect, test } from "./fixtures";
import { registerUser, uniqueUsername } from "./helpers";

/** Controllo automatico (axe, WCAG 2.1 AA): etichette, ruoli, contrasti… */
async function audit(page: Page, label: string, found: string[]) {
  const { violations } = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    // Il riquadro avvisi di Next (solo sviluppo) e gli sprite esterni non sono nostri.
    .exclude("nextjs-portal")
    .analyze();
  const report = violations.map(
    (v) =>
      `${label} · ${v.id} (${v.impact}): ${v.help}\n` +
      v.nodes
        .slice(0, 4)
        .map(
          (n) => `    ${n.target.join(" ")} — ${n.failureSummary?.split("\n").slice(1).join(" ")}`,
        )
        .join("\n"),
  );
  found.push(...report);
}

for (const scheme of ["light", "dark"] as const) {
  test(`accessibilità (${scheme === "light" ? "tema chiaro" : "tema scuro"})`, async ({
    page,
  }, testInfo) => {
    test.setTimeout(180_000);
    await page.emulateMedia({ colorScheme: scheme });
    const found: string[] = [];

    for (const path of ["/login", "/register"]) {
      await page.goto(path);
      await audit(page, path, found);
    }

    await registerUser(page, uniqueUsername(testInfo, scheme[0]));
    await page.goto("/allenatori");
    await audit(page, "/allenatori (vuoto)", found);
    await page.goto("/pokemon/miei");
    await audit(page, "/pokemon/miei (vuoto)", found);

    await page.goto("/allenatori");
    await page.getByLabel("Nuovo allenatore").fill("Ash");
    await page.getByRole("button", { name: "Crea allenatore" }).click();
    await expect(page).toHaveURL(/\/allenatori\/[0-9a-f-]{36}$/);
    await audit(page, "scheda allenatore", found);
    await page.getByRole("searchbox", { name: "Aggiungi Pokémon" }).fill("Barboach");
    await page.getByRole("button", { name: /^Barboach/ }).click();
    await expect(page).toHaveURL(/\/pokemon\/[0-9a-f-]{36}$/);
    await audit(page, "scheda Pokémon", found);

    await page.goto("/campagne");
    await page.getByLabel("Nome", { exact: true }).fill("Prova");
    await page.getByRole("button", { name: "+ Crea campagna" }).click();
    await expect(page).toHaveURL(/\/campagne\/[0-9a-f-]{36}$/);
    const campaign = page.url();
    await audit(page, "campagna", found);
    await page.goto(`${campaign}/generatore`);
    await page.getByRole("button", { name: "Genera", exact: true }).click();
    await expect(page.getByRole("article").first()).toBeVisible();
    await audit(page, "generatore", found);
    await page.goto(`${campaign}/biomi`);
    await page.getByRole("button", { name: /Bosco/ }).click();
    await audit(page, "biomi", found);

    for (const path of [
      "/dex",
      "/dex/barboach",
      "/mosse",
      "/strumenti",
      "/altro",
      "/allenatori",
      "/pokemon/miei",
      "/fanmade",
      "/fanmade/nuovo",
      "/campagne",
      "/pagina-che-non-esiste",
    ]) {
      await page.goto(path);
      await audit(page, path, found);
    }
    expect(found, found.join("\n")).toEqual([]);
  });
}

test("tastiera: salta al contenuto e suggerimenti con frecce e Invio", async ({
  page,
}, testInfo) => {
  await registerUser(page, uniqueUsername(testInfo, "k"));
  await page.goto("/fanmade/nuovo");

  // Il primo Tab porta al link "Salta al contenuto", visibile solo con il focus.
  await page.keyboard.press("Tab");
  const skip = page.getByRole("link", { name: "Salta al contenuto" });
  await expect(skip).toBeFocused();
  await expect(skip).toBeInViewport();
  await page.keyboard.press("Enter");
  await expect(page.locator("#contenuto")).toBeFocused();

  // Abilità: scrivi, freccia giù, Invio.
  const ability = page.getByRole("combobox", { name: "Abilità 1" });
  await ability.fill("punk");
  await ability.press("ArrowDown");
  await expect(page.getByRole("option", { name: "Punk Rock" })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await ability.press("Enter");
  await expect(ability).toHaveValue("Punk Rock");
  await expect(page.getByRole("listbox")).toHaveCount(0);

  // Mossa: + mossa da tastiera, freccia, Invio; Esc chiude i suggerimenti.
  await page.getByRole("button", { name: "Aggiungi mossa a Starter" }).focus();
  await page.keyboard.press("Enter");
  const move = page.getByRole("combobox", { name: "Mossa da aggiungere a Starter" });
  await expect(move).toBeFocused();
  await move.pressSequentially("thunder sh");
  await move.press("ArrowDown");
  await move.press("Enter");
  await expect(page.getByRole("button", { name: "Togli Thunder Shock da Starter" })).toBeVisible();
  await move.pressSequentially("gro");
  await expect(page.getByRole("listbox")).toBeVisible();
  await move.press("Escape");
  await expect(page.getByRole("listbox")).toHaveCount(0);
});
