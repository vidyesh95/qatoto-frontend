import type { Page, Locator } from "@playwright/test";

// Page object for the home-page filter chip row (src/components/home/feed/filter.tsx).
//
// THE CHIPS ARE LINKS, NOT BUTTONS. The row's selection lives in the URL — the component's
// own banner explains why — so each chip is an `<a>` inside a `role="toolbar"` container, and
// "selected" is `aria-current="true"` rather than a piece of client state. An earlier version
// of this file queried `getByRole("button")` against `src/components/home/filter.tsx`, a path
// that no longer exists; every locator below is anchored to a role or an ARIA attribute now so
// a restyle cannot silently break it the same way.
//
// THE CHEVRONS ARE `aria-hidden`. They are decorative duplicates of scrolling the row, hidden
// from the accessibility tree on purpose, so `getByRole("button")` can NEVER match them. They
// are located by their `title` instead.
export class FilterPage {
  readonly page: Page;
  // Scroll container holding the chips. Located by the cursor-grab class that
  // only this element has on the home page.
  readonly scrollContainer: Locator;
  readonly backButton: Locator;
  readonly forwardButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.scrollContainer = page.getByRole("toolbar", { name: "Filter videos" });
    this.backButton = page.locator('button[title="Scroll filter chips left"]');
    this.forwardButton = page.locator('button[title="Scroll filter chips right"]');
  }

  // Every chip in the row. Scoped to the container, so the chevrons — siblings of it, not
  // children — cannot be picked up even though they are also clickable.
  chips(): Locator {
    return this.scrollContainer.getByRole("link");
  }

  // Locator for a single chip by visible text. `exact: true` so "News" does
  // not also match "Recently uploaded News-ish".
  chip(label: string): Locator {
    return this.scrollContainer.getByRole("link", { name: label, exact: true });
  }

  // The labels of every chip currently marked selected.
  //
  // READS `aria-current`, NOT THE `bg-primary` CLASS. The class is how selection LOOKS; the
  // attribute is what it MEANS, and it is the same signal a screen reader gets. Asserting on
  // the class made this file fail the moment the chips were restyled, which is a test breaking
  // on a change that broke nothing.
  async selectedChipLabels(): Promise<string[]> {
    return this.scrollContainer
      .locator('a[aria-current="true"]')
      .allTextContents()
      .then((texts) => texts.map((label) => label.trim()));
  }

  // Reads the container's live scroll metrics so tests can assert overflow,
  // scroll progress, or that drag actually moved the content.
  async scrollMetrics(): Promise<{
    scrollLeft: number;
    scrollWidth: number;
    clientWidth: number;
  }> {
    return this.scrollContainer.evaluate((el) => ({
      scrollLeft: el.scrollLeft,
      scrollWidth: el.scrollWidth,
      clientWidth: el.clientWidth,
    }));
  }

  // Performs a real mouse-drag from the chip row's left side to the right
  // (negative dx) or vice versa. Uses page.mouse so React's pointer handlers
  // fire end-to-end, including setPointerCapture.
  //
  // ONE `move` WITH `steps`, NOT A LOOP OF `move` CALLS — and the difference is not cosmetic.
  // The hand-rolled loop issued 20 separate moves, of which FIREFOX delivered exactly one
  // pointermove to the page (chromium delivered two). A single event cannot clear the
  // component's 5px drag threshold, so the row never scrolled and this suite failed on
  // firefox only, looking like a browser-specific product bug. It is not one: a real mouse
  // emits a continuous stream of moves. `steps` makes Playwright synthesise that stream
  // itself, which every browser delivers.
  async dragHorizontally(deltaPx: number): Promise<void> {
    const box = await this.scrollContainer.boundingBox();
    if (!box) throw new Error("filter scroll container has no bounding box");
    const startX = box.x + box.width / 2;
    const y = box.y + box.height / 2;
    await this.page.mouse.move(startX, y);
    await this.page.mouse.down();
    await this.page.mouse.move(startX + deltaPx, y, { steps: 20 });
    await this.page.mouse.up();
  }
}
