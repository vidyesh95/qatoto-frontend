import { test, expect } from "../fixtures/test-base";

// Static health check for the (information) route group — the marketing
// surfaces. We do NOT assert specific copy or layout (would be brittle and
// duplicate the design review). We just confirm each route:
//   1. responds with a non-error HTTP status (< 400)
//   2. renders at least one heading (proves React actually mounted, not
//      just that Next served an empty shell)
//
// This catches build breaks, missing page.tsx files, server errors,
// and total hydration failures — the regression class most likely to
// silently ship.
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
