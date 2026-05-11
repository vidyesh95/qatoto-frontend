import { test, expect } from "../fixtures/test-base";

// Navbar contains <form action="/search" method="get"> with an <input name="query">.
// On submit the browser builds /search?query=<value>. These tests verify the form
// wiring without relying on a backend implementation of /search.
test.describe("navbar search", () => {
  // Fill the searchbox, submit, assert the resulting URL contains both the
  // /search path AND the query=naruto param. Confirms input name + form action
  // are both correct.
  test("submits GET to /search with query param", async ({ page, navbar }) => {
    await page.goto("/");
    await navbar.submitSearch("naruto");
    await expect(page).toHaveURL(/\/search\?query=naruto/);
  });

  // Clicking submit with no query still navigates to /search (no client-side
  // "must be non-empty" validation). Documents current behavior — if we ever
  // add validation, this test should flip to expect the URL not to change.
  test("empty submit still navigates to /search", async ({ page, navbar }) => {
    await page.goto("/");
    await navbar.searchSubmit.click();
    await expect(page).toHaveURL(/\/search/);
  });
});
