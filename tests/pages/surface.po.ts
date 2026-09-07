import type { Page, Locator } from "@playwright/test";

/**
 * Page object for the three SERVER-SIDE controls that the Store and R&D surfaces share.
 *
 * One object rather than a `store.po.ts` and an `rnd.po.ts`, because the two surfaces render
 * the *same* three components — `src/components/home/shared/filter-chip-row.tsx`,
 * `cursor-page-control.tsx` and `status-panel.tsx`. `filter-chip-row.tsx:9-11` records that it
 * was hoisted out of `research-and-development/sections/` precisely because the store needed
 * it verbatim; splitting it back apart here would re-create the duplication that hoist removed.
 *
 * ⚠️ EVERY LOCATOR HANGS OFF `main`, AND THAT IS NOT TIDINESS. Every `(home)` page renders TWO
 * `<h1>` elements: the navbar's mobile page title (`src/components/home/layout/navbar.tsx:158`,
 * `md:hidden`) and the page's own. On `/store/providers` those are "Providers" and "Trade
 * services" respectively. The navbar one is display:none at the desktop widths the three
 * Playwright projects use, so an unscoped `getByRole("heading", { level: 1 })` happens to pass
 * today — and would start matching two elements the moment a mobile project is uncommented in
 * `playwright.config.ts:52-69`. Scoping to `main` makes the queries viewport-independent now.
 */
export class SurfacePage {
  readonly page: Page;
  /** The page's own content region. Everything below is scoped to it. */
  readonly main: Locator;

  constructor(page: Page) {
    this.page = page;
    this.main = page.getByRole("main");
  }

  /**
   * A heading inside `main`.
   *
   * `/store` and `/store/categories` have NO page-level `<h1>` at all — they lead with
   * `SectionHeader`'s `<h2>` (`src/components/home/store/sections/section-header.tsx:15-19`) —
   * which is why the level is a parameter rather than hard-coded to 1.
   */
  heading(level: 1 | 2 | 3, name?: string | RegExp): Locator {
    return name === undefined
      ? this.main.getByRole("heading", { level })
      : this.main.getByRole("heading", { level, name });
  }

  /**
   * One row of server-side filter chips, located by the `aria-label` its call site passed to
   * `FilterChipRow`. The row is a `<nav>` (`filter-chip-row.tsx:48`) — its own comment explains
   * that the chips are links announced as a set of destinations, not a toggle group.
   */
  filterRow(ariaLabel: string): Locator {
    return this.main.getByRole("navigation", { name: ariaLabel });
  }

  /** Every chip in one row. */
  chips(ariaLabel: string): Locator {
    return this.filterRow(ariaLabel).getByRole("link");
  }

  /**
   * The labels of the chips currently marked selected in one row.
   *
   * READS `aria-current`, NOT THE SELECTED BACKGROUND CLASS — the same reasoning
   * `tests/pages/filter.po.ts:44-47` already records for the home rail. The attribute is what
   * selection MEANS and is what a screen reader is handed; the class is only how it looks.
   */
  async selectedChipLabels(ariaLabel: string): Promise<string[]> {
    return this.filterRow(ariaLabel)
      .locator('a[aria-current="true"]')
      .allTextContents()
      .then((labels) => labels.map((label) => label.trim()));
  }

  /**
   * The "next keyset page" link.
   *
   * TWO STEPS, NOT ONE, AND THE SECOND IS LOAD-BEARING: `CursorPageControl` renders a `<nav
   * aria-label={label}>` wrapping a single `<Link>` whose TEXT IS THAT SAME LABEL
   * (`cursor-page-control.tsx:46-53`). So `getByRole("link", { name: "Show more results" })`
   * and `getByRole("navigation", { name: "Show more results" })` both resolve, and asking for
   * the link inside the nav is the only phrasing that says which one is meant.
   *
   * Resolves to zero elements when there is no next page — the control returns `null` unless
   * `hasMore && nextCursor !== null` (`:43`).
   */
  nextPageLink(label: string): Locator {
    return this.filterRow(label).getByRole("link");
  }

  /**
   * An empty / error / sign-in-required panel's message.
   *
   * `getByText`, NEVER `getByRole`: `StatusPanel` renders the message as a bare `<p>` with no
   * role, no heading and no landmark (`src/components/home/shared/status-panel.tsx:30`).
   */
  statusMessage(text: string): Locator {
    return this.main.getByText(text, { exact: true });
  }

  /**
   * The "Sign in" link that `StoreSignInRequiredPanel` / `RndSignInRequiredPanel` render as
   * their action. It is the ONLY role-queryable part of any status panel.
   */
  signInPanelLink(): Locator {
    return this.main.getByRole("link", { name: "Sign in", exact: true });
  }

  /** Every link in `main` whose href starts with `prefix`. */
  linksTo(prefix: string): Locator {
    return this.main.locator(`a[href^="${prefix}"]`);
  }

  /** The `href` of every link matched by `locator`, in document order. */
  async hrefsOf(locator: Locator): Promise<string[]> {
    return locator.evaluateAll((anchors) =>
      anchors.map((anchor) => anchor.getAttribute("href") ?? ""),
    );
  }
}
