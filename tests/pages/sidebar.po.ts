import type { Page, Locator } from "@playwright/test";

/**
 * Label → destination for the sidebar's primary nav, mirrored from `NAVIGATION_CONFIG` in
 * `src/components/home/layout/sidebar.tsx`.
 *
 * THIS MAP HAD DRIFTED PAST THE APP, and the four corrections are worth naming so they are not
 * "fixed" back: `Create` goes to `/studio` rather than `/create`; `Your sales` is now `Sales` at
 * `/sales`; and `AI` and `Your videos` were REMOVED because the sidebar has no such entries at all
 * — it never had an AI row, and a creator's own videos live under `/studio`.
 *
 * ⚠️ THE ENTRIES MARKED BELOW ARE SESSION-GATED and do not render for a signed-out visitor.
 * `sidebar.tsx` filters every item on a `requiresSession` flag and suppresses a section whose items
 * were all filtered out, so a spec that clicks one of these from a fresh context finds nothing. They
 * stay in this map because the label → route mapping is still correct; what is NOT safe is putting
 * one in a signed-out spec's label list.
 */
export const SIDEBAR_ROUTES = {
  Create: "/studio",
  Home: "/",
  Blueprints: "/blueprints",
  Store: "/store",
  "R&D": "/research-and-development",
  Library: "/library", // session-gated
  History: "/history", // session-gated
  Wishlist: "/wishlist", // session-gated
  Cart: "/cart", // session-gated
  "Orders and returns": "/orders-and-returns", // session-gated
  Listings: "/listings", // session-gated
  Sales: "/sales", // session-gated
  "Advertise with us": "/advertise-with-us",
  "Customer service": "/customer-service",
} as const;

export type SidebarLabel = keyof typeof SIDEBAR_ROUTES;

/**
 * Label → destination for the sidebar's footer links, mirrored from `FOOTER_LINKS_ROW1/ROW2` in
 * `src/components/home/layout/sidebar.tsx`.
 *
 * `Roadmap` AND `Policies and Safety` WERE MISSING and are added here. They were not wrong entries
 * like the four `SIDEBAR_ROUTES` carried — they were absent ones, which is why they were left out
 * of the first correction pass: adding a row to this map is only safe while the spec's
 * `footerLabels` list stays as it is. It does. Nothing new runs; the map simply stops disagreeing
 * with the sidebar it mirrors.
 */
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
  Roadmap: "/roadmap",
  "Policies and Safety": "/policies-and-safety",
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
