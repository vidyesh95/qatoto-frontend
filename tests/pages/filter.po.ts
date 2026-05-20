import type { Page, Locator } from "@playwright/test";

// Page object for the home-page filter chip row (src/components/home/filter.tsx).
// Exposes locators for the scroll container, the chevron buttons, and helpers
// to interrogate chip selection state and chip layout.
export class FilterPage {
  readonly page: Page;
  // Scroll container holding the chips. Located by the cursor-grab class that
  // only this element has on the home page.
  readonly scrollContainer: Locator;
  readonly backButton: Locator;
  readonly forwardButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.scrollContainer = page.locator("main div.overflow-x-auto.cursor-grab");
    this.backButton = page.getByRole("button", { name: "Navigate filter back" });
    this.forwardButton = page.getByRole("button", { name: "Navigate filter forward" });
  }

  // Returns a Locator for every chip button. Excludes the chevron buttons
  // because they are siblings of the scroll container, not children.
  chips(): Locator {
    return this.scrollContainer.getByRole("button");
  }

  // Locator for a single chip by visible text. `exact: true` so "News" does
  // not also match "Recently uploaded News-ish".
  chip(label: string): Locator {
    return this.scrollContainer.getByRole("button", { name: label, exact: true });
  }

  // Selected chips are styled with the `bg-primary` class (filled theme
  // colour). Returns the labels of every chip currently in that state.
  async selectedChipLabels(): Promise<string[]> {
    return this.scrollContainer
      .locator("button.bg-primary")
      .allTextContents()
      .then((texts) => texts.map((t) => t.trim()));
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
  async dragHorizontally(deltaPx: number): Promise<void> {
    const box = await this.scrollContainer.boundingBox();
    if (!box) throw new Error("filter scroll container has no bounding box");
    const startX = box.x + box.width / 2;
    const y = box.y + box.height / 2;
    await this.page.mouse.move(startX, y);
    await this.page.mouse.down();
    // Move in small steps so the drag-threshold logic engages exactly like a
    // real user drag, not a single teleport.
    const steps = 20;
    for (let step = 1; step <= steps; step++) {
      await this.page.mouse.move(startX + (deltaPx * step) / steps, y);
    }
    await this.page.mouse.up();
  }
}
