import { test, expect } from "../fixtures/test-base";

test.describe("smoke", () => {
  test("root loads with navbar, sidebar, and brand", async ({ page, navbar, sidebar }) => {
    await page.goto("/");
    await expect(navbar.root).toBeVisible();
    await expect(navbar.brand).toBeVisible();
    await expect(sidebar.root).toBeVisible();
  });

  test("404 page renders for unknown route", async ({ page }) => {
    const resp = await page.goto("/this-route-does-not-exist");
    expect(resp?.status()).toBe(404);
  });
});
