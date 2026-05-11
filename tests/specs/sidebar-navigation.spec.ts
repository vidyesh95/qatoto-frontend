import { test, expect } from "../fixtures/test-base";
import {
  SIDEBAR_ROUTES,
  FOOTER_ROUTES,
  type SidebarLabel,
  type FooterLabel,
} from "../pages/sidebar.po";

test.describe("sidebar navigation", () => {
  const primaryLabels: SidebarLabel[] = ["Anime", "Store", "AI", "Library", "Cart"];

  for (const label of primaryLabels) {
    test(`sidebar link "${label}" navigates to ${SIDEBAR_ROUTES[label]}`, async ({
      page,
      sidebar,
    }) => {
      await page.goto("/");
      await sidebar.navLink(label).click();
      await expect(page).toHaveURL(new RegExp(`${SIDEBAR_ROUTES[label]}$`));
    });
  }

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
