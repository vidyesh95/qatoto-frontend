import { test, expect } from "../fixtures/test-base";

const DISCLAIMER_ROUTES = [
  "/community-guidelines",
  "/copyright-policy",
  "/privacy-policy",
  "/terms-and-conditions",
  "/vulnerability-disclosure-policy",
];

test.describe("disclaimer pages", () => {
  for (const route of DISCLAIMER_ROUTES) {
    test(`${route} loads with 200 and has a heading`, async ({ page }) => {
      const resp = await page.goto(route);
      expect(resp?.status()).toBeLessThan(400);
      await expect(page.getByRole("heading").first()).toBeVisible();
    });
  }
});
