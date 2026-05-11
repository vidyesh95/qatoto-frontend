import { test, expect } from "../fixtures/test-base";

test.describe("navbar search", () => {
  test("submits GET to /search with query param", async ({ page, navbar }) => {
    await page.goto("/");
    await navbar.submitSearch("naruto");
    await expect(page).toHaveURL(/\/search\?query=naruto/);
  });

  test("empty submit still navigates to /search", async ({ page, navbar }) => {
    await page.goto("/");
    await navbar.searchSubmit.click();
    await expect(page).toHaveURL(/\/search/);
  });
});
