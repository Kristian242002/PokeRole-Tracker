import { test as base, expect } from "@playwright/test";

/** Come `test`, ma fallisce se la pagina lancia errori JavaScript (§16.2). */
export const test = base.extend<{ failOnPageError: void }>({
  failOnPageError: [
    async ({ page }, use) => {
      const errors: Error[] = [];
      page.on("pageerror", (err) => errors.push(err));
      await use();
      expect(errors, "errori JavaScript nella pagina").toEqual([]);
    },
    { auto: true },
  ],
});

export { expect };
