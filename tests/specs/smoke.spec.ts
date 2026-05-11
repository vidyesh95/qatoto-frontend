import { test, expect } from "../fixtures/test-base";

// Baseline app-up checks. If these fail, nothing else will pass — the app
// is fundamentally broken (dev server down, hydration crash, layout missing).
test.describe("smoke", () => {
  // Visit "/" and assert the three pieces of the (home) chrome render:
  // <nav>, the "Qatoto" brand link, and <aside>. Catches total breakage.
  test("root loads with navbar, sidebar, and brand", async ({ page, navbar, sidebar }) => {
    await page.goto("/");
    await expect(navbar.root).toBeVisible();
    await expect(navbar.brand).toBeVisible();
    await expect(sidebar.root).toBeVisible();
  });

  // Hit a route that doesn't exist and confirm Next returns 404 (not 500 / 200).
  // Guards against accidentally adding a catch-all route or breaking not-found.
  test("404 page renders for unknown route", async ({ page }) => {
    const resp = await page.goto("/this-route-does-not-exist");
    expect(resp?.status()).toBe(404);
  });
});
