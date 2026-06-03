import { test, expect } from "../fixtures/test-base";

// Covers the (home) route group chrome: navbar links, sidebar toggle state
// machine, and the navbar → sign-in entry point.
test.describe("home shell", () => {
  // From any non-root page, clicking the "Qatoto" brand link in the navbar
  // must return the user to "/". Verifies the brand doubles as a Home button.
  test("brand link returns to root", async ({ page, navbar }) => {
    await page.goto("/anime");
    await navbar.brand.click();
    await expect(page).toHaveURL("/");
  });

  // Sidebar has a wide (expanded) and narrow (collapsed) layout driven by
  // SidebarProvider.isCollapsed. We capture <aside> width, click the toggle,
  // poll until width changes, click again, poll until width returns. This
  // verifies the toggle is bidirectional and the conditional render in
  // sidebar.tsx (collapsed branch at ~line 370) actually flips.
  test("sidebar toggle collapses and re-expands aside width", async ({ page, navbar, sidebar }) => {
    await page.goto("/");
    await expect(sidebar.root).toBeVisible();
    const expandedBox = await sidebar.root.boundingBox();

    await navbar.toggleSidebar.click();
    await expect.poll(async () => (await sidebar.root.boundingBox())?.width).not.toBe(expandedBox?.width);

    await navbar.toggleSidebar.click();
    await expect.poll(async () => (await sidebar.root.boundingBox())?.width).toBe(expandedBox?.width);
  });

  // The "Sign in" pill in the top-right of the navbar must route to /sign-in
  // and the page must render with the "Sign in" h1. Confirms the auth entry
  // point + the (auth) layout boot correctly.
  test("sign-in link in navbar reaches /sign-in", async ({ page, navbar }) => {
    await page.goto("/");
    await navbar.signInLink.click();
    await expect(page).toHaveURL(/\/sign-in$/);
    await expect(page.getByRole("heading", { name: "Sign in", exact: true })).toBeVisible();
  });
});
