import { test, expect } from "../fixtures/test-base";
import {
  SIDEBAR_ROUTES,
  FOOTER_ROUTES,
  type SidebarLabel,
  type FooterLabel,
} from "../pages/sidebar.po";

// Data-driven coverage of every clickable destination in the sidebar.
// One generated test per label = granular failure reporting (Playwright will
// tell you exactly which link broke instead of one giant test failing on
// the first bad link).
test.describe("sidebar navigation", () => {
  // Primary nav items live in NAVIGATION_CONFIG inside sidebar.tsx.
  // We don't test every item (would be brittle and slow); we cover the five
  // most-trafficked product surfaces.
  const primaryLabels: SidebarLabel[] = ["Anime", "Store", "AI", "Library", "Cart"];

  for (const label of primaryLabels) {
    // For each label: visit "/", click the matching <Link> in the sidebar,
    // and assert the URL matches the route in SIDEBAR_ROUTES. This proves
    // the label → href mapping in NAVIGATION_CONFIG is correct.
    test(`sidebar link "${label}" navigates to ${SIDEBAR_ROUTES[label]}`, async ({
      page,
      sidebar,
    }) => {
      await page.goto("/");
      await sidebar.navLink(label).click();
      await expect(page).toHaveURL(new RegExp(`${SIDEBAR_ROUTES[label]}$`));
    });
  }

  // Footer links live in FOOTER_LINKS_ROW1/ROW2. They route to the
  // (information) and (disclaimers) groups. Same pattern as above.
  const footerLabels: FooterLabel[] = ["About", "Careers", "Contact Us", "Blogs", "Press"];

  for (const label of footerLabels) {
    test(`footer link "${label}" navigates to ${FOOTER_ROUTES[label]}`, async ({
      page,
      sidebar,
    }) => {
      await page.goto("/");
      await sidebar.footerLink(label).first().click();
      await expect(page).toHaveURL(new RegExp(`${FOOTER_ROUTES[label]}$`));
    });
  }
});
