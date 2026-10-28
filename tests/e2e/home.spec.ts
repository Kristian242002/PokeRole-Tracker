import { expect, test } from "./fixtures";

test("la home reindirizza al login e la navigazione è visibile", async ({ page }, testInfo) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/login$/);

  await page.goto("/dex");
  if (testInfo.project.name === "telefono") {
    const tabs = page.getByRole("navigation", { name: "Navigazione principale" });
    await expect(tabs).toBeVisible();
    for (const label of ["Pokémon", "Allenatori", "Pokédex", "Mosse", "Altro"]) {
      await expect(tabs.getByRole("link", { name: label })).toBeVisible();
    }
    await expect(tabs.getByRole("link", { name: "Pokédex" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    await tabs.getByRole("link", { name: "Altro" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Altro" })).toBeVisible();
    await expect(page.getByRole("link", { name: /Strumenti/ })).toBeVisible();
  } else {
    const side = page.getByRole("complementary", { name: "Menu principale" });
    await expect(side).toBeVisible();
    for (const label of [
      "I miei Pokémon",
      "I miei allenatori",
      "Pokédex",
      "Mosse",
      "Strumenti",
      "Fanmade",
      "Campagne",
    ]) {
      await expect(side.getByRole("link", { name: label })).toBeVisible();
    }
    await expect(page.getByRole("navigation", { name: "Navigazione principale" })).toBeHidden();
  }
});

test("le sezioni personali richiedono il login", async ({ page }) => {
  await page.goto("/allenatori");
  await expect(page).toHaveURL(/\/login$/);
});
