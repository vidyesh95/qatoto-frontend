import { test as base, expect } from "@playwright/test";
import { NavbarPage } from "../pages/navbar.po";
import { SidebarPage } from "../pages/sidebar.po";
import { AuthPage } from "../pages/auth.po";
import { FilterPage } from "../pages/filter.po";
import { SurfacePage } from "../pages/surface.po";

type Fixtures = {
  navbar: NavbarPage;
  sidebar: SidebarPage;
  auth: AuthPage;
  filter: FilterPage;
  surface: SurfacePage;
};

export const test = base.extend<Fixtures>({
  navbar: async ({ page }, use) => {
    await use(new NavbarPage(page));
  },
  sidebar: async ({ page }, use) => {
    await use(new SidebarPage(page));
  },
  auth: async ({ page }, use) => {
    await use(new AuthPage(page));
  },
  filter: async ({ page }, use) => {
    await use(new FilterPage(page));
  },
  surface: async ({ page }, use) => {
    await use(new SurfacePage(page));
  },
});

export { expect };
