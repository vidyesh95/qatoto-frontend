import type { Page, Locator } from "@playwright/test";

export const SIDEBAR_ROUTES = {
  Create: "/create",
  Home: "/",
  Anime: "/anime",
  Store: "/store",
  AI: "/ai",
  Library: "/library",
  History: "/history",
  "Your videos": "/your-videos",
  Cart: "/cart",
  "Orders and returns": "/orders-and-returns",
  "Your sales": "/your-sales",
  "Advertise with us": "/advertise-with-us",
  "Your account": "/your-account",
  "Customer service": "/customer-service",
  "Sign out": "/sign-out",
} as const;

export type SidebarLabel = keyof typeof SIDEBAR_ROUTES;

export const FOOTER_ROUTES = {
  "How Qatoto Works": "/how-qatoto-works",
  About: "/about",
  Press: "/press",
  Blogs: "/blogs",
  "Contact Us": "/contact-us",
  Creator: "/creator",
  Careers: "/careers",
  Developers: "/developers",
  "Terms and Conditions": "/terms-and-conditions",
  "Privacy Policy": "/privacy-policy",
  "Copyright Policy": "/copyright-policy",
  "Community Guidelines": "/community-guidelines",
  "Vulnerability Disclosure Policy": "/vulnerability-disclosure-policy",
} as const;

export type FooterLabel = keyof typeof FOOTER_ROUTES;

export class SidebarPage {
  readonly page: Page;
  readonly root: Locator;

  constructor(page: Page) {
    this.page = page;
    this.root = page.locator("aside");
  }

  navLink(label: SidebarLabel): Locator {
    // Sidebar renders `<Image alt={label}>` + text, so accessible name doubles.
    return this.root.getByRole("link", { name: new RegExp(`^${label}\\s+${label}$`, "i") });
  }

  footerLink(label: FooterLabel): Locator {
    return this.root.getByRole("link", { name: label, exact: true });
  }
}
