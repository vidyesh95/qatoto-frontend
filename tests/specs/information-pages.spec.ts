import { test, expect } from "../fixtures/test-base";

const INFORMATION_ROUTES = [
  "/about",
  "/blogs",
  "/careers",
  "/contact-us",
  "/creator",
  "/developers",
  "/how-qatoto-works",
  "/press",
];

test.describe("information pages", () => {
  for (const route of INFORMATION_ROUTES) {
    test(`${route} loads with 200 and has a heading`, async ({ page }) => {
      const resp = await page.goto(route);
      expect(resp?.status()).toBeLessThan(400);
      await expect(page.getByRole("heading").first()).toBeVisible();
    });
  }
});
