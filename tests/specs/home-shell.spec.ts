import { test, expect } from "../fixtures/test-base";

test.describe("home shell", () => {
  test("brand link returns to root", async ({ page, navbar }) => {
    await page.goto("/anime");
    await navbar.brand.click();
    await expect(page).toHaveURL("/");
  });

  test("sidebar toggle collapses and re-expands aside width", async ({ page, navbar, sidebar }) => {
    await page.goto("/");
    await expect(sidebar.root).toBeVisible();
    const expandedBox = await sidebar.root.boundingBox();

    await navbar.toggleSidebar.click();
    await expect
      .poll(async () => (await sidebar.root.boundingBox())?.width)
      .not.toBe(expandedBox?.width);

    await navbar.toggleSidebar.click();
    await expect
      .poll(async () => (await sidebar.root.boundingBox())?.width)
      .toBe(expandedBox?.width);
  });

  test("sign-in link in navbar reaches /sign-in", async ({ page, navbar }) => {
    await page.goto("/");
    await navbar.signInLink.click();
    await expect(page).toHaveURL(/\/sign-in$/);
    await expect(page.getByRole("heading", { name: "Sign in", exact: true })).toBeVisible();
  });
});
