import { test, expect } from "../fixtures/test-base";

// Same shape as information-pages.spec.ts, but for the (disclaimers) group:
// legal / policy pages. Same minimal contract per route — non-error status
// and at least one rendered heading. These pages rarely change, so a smoke
// check is enough; we only want to catch the case where a route silently
// disappears or starts 500-ing.
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
