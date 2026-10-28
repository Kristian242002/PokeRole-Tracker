import { head } from "@vercel/blob";
import type { Page } from "@playwright/test";
import { expect, test } from "./fixtures";
import { registerUser, uniqueUsername } from "./helpers";

// Usa il Vercel Blob vero: si lancia solo a mano con E2E_BLOB=1 (e il token in .env.local).
test.skip(!process.env.E2E_BLOB, "Test immagini: E2E_BLOB=1 per caricare davvero su Vercel Blob");

/** "Foto" grande generata nel browser (2400×1600). */
async function bigPhoto(page: Page, color: string) {
  const data = await page.evaluate((c) => {
    const canvas = document.createElement("canvas");
    canvas.width = 2400;
    canvas.height = 1600;
    const ctx = canvas.getContext("2d")!;
    const g = ctx.createLinearGradient(0, 0, 2400, 1600);
    g.addColorStop(0, c);
    g.addColorStop(1, "#1b2440");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 2400, 1600);
    for (let i = 0; i < 400; i++) {
      ctx.fillStyle = `hsl(${(i * 37) % 360} 70% 60%)`;
      ctx.fillRect((i * 97) % 2400, (i * 53) % 1600, 60, 60);
    }
    return canvas.toDataURL("image/jpeg", 0.95).split(",")[1];
  }, color);
  return { name: "foto.jpg", mimeType: "image/jpeg", buffer: Buffer.from(data, "base64") };
}

async function exists(url: string) {
  try {
    await head(url);
    return true;
  } catch {
    return false;
  }
}

async function uploadPortrait(page: Page, color: string, previous?: string) {
  await page
    .locator('input[type="file"]')
    .first()
    .setInputFiles(await bigPhoto(page, color));
  const cropper = page.getByRole("dialog", { name: "Inquadra l'immagine" });
  await cropper.getByRole("slider", { name: "Zoom" }).fill("1.5");
  await cropper.getByRole("button", { name: "Usa immagine" }).click();
  const img = page.getByRole("img", { name: "Ritratto di Ash" });
  if (previous) await expect(img).not.toHaveAttribute("src", previous, { timeout: 30_000 });
  await expect(img).toHaveAttribute("src", /blob\.vercel-storage\.com/, { timeout: 30_000 });
  return (await img.getAttribute("src"))!;
}

test("ritratto: foto grande → < 300 KB, sostituzione e rimozione eliminano il vecchio blob", async ({
  page,
}, testInfo) => {
  test.setTimeout(120_000);
  await registerUser(page, uniqueUsername(testInfo, "i"));
  await page.goto("/allenatori");
  await page.getByLabel("Nuovo allenatore").fill("Ash");
  await page.getByRole("button", { name: "Crea allenatore" }).click();
  await expect(page).toHaveURL(/\/allenatori\/[0-9a-f-]{36}$/);

  const first = await uploadPortrait(page, "#d62839");
  const blob = await head(first);
  expect(blob.size).toBeLessThan(300 * 1024);
  expect(blob.contentType).toMatch(/image\/(webp|jpeg)/);
  await page.reload();
  await expect(page.getByRole("img", { name: "Ritratto di Ash" })).toHaveAttribute("src", first);

  const second = await uploadPortrait(page, "#2f6fd6", first);
  expect(second).not.toBe(first);
  await expect.poll(() => exists(first)).toBe(false);

  await page.getByRole("button", { name: "Togli ritratto" }).click();
  await expect(page.getByRole("img", { name: "Ritratto di Ash" })).toHaveCount(0);
  await expect.poll(() => exists(second)).toBe(false);
});
