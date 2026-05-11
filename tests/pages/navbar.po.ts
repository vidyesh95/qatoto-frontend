import type { Page, Locator } from "@playwright/test";

export class NavbarPage {
  readonly page: Page;
  readonly root: Locator;
  readonly brand: Locator;
  readonly toggleSidebar: Locator;
  readonly searchInput: Locator;
  readonly searchSubmit: Locator;
  readonly signInLink: Locator;

  constructor(page: Page) {
    this.page = page;
    this.root = page.locator("nav").first();
    this.brand = this.root.getByRole("link", { name: "Qatoto" });
    this.toggleSidebar = page.getByRole("button", { name: "toggle sidebar" });
    this.searchInput = page.getByRole("searchbox", { name: "Search" });
    this.searchSubmit = this.root.locator('form[action="/search"] button[type="submit"]');
    this.signInLink = this.root.getByRole("link", { name: /Sign in/i });
  }

  async submitSearch(query: string) {
    await this.searchInput.fill(query);
    await this.searchSubmit.click();
  }
}
