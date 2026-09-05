import { test, expect } from "../fixtures/test-base";

// Covers the home-page filter chip row (src/components/home/feed/filter.tsx).
// Verifies single-select selection, chevron visibility tied to scroll
// overflow, drag-to-scroll, drag-suppresses-click, and layout invariants
// (single row, no vertical overflow, chips inside the visible viewport).
//
// SELECTING A CHIP IS A NAVIGATION, NOT A setState. The chips are links and the selection
// lives in the URL, so every post-click assertion here polls: the click resolves as soon as
// the anchor is activated, while the selection only changes once the new render lands. The
// original one-shot `expect(await ...)` read the OLD row and reported a stale selection —
// which looked like a broken filter rather than a test racing the navigation.
test.describe("filter chips", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  // The chip row must render at least the "All" chip on first paint —
  // catches regressions where the component fails to hydrate or throws.
  test("renders the chip row with the All chip visible", async ({ filter }) => {
    await expect(filter.scrollContainer).toBeVisible();
    await expect(filter.chip("All")).toBeVisible();
  });

  // On first paint "All" must be the selected chip. Encoded by the
  // `text-white` class on the selected button.
  test("All chip is selected by default", async ({ filter }) => {
    await expect.poll(() => filter.selectedChipLabels()).toEqual(["All"]);
  });

  // Clicking a different chip must move the selection — exactly one chip
  // stays styled as selected at any time (single-select invariant).
  test("clicking a chip moves selection and keeps single-select", async ({ filter }) => {
    await filter.chip("Trending").click();
    await expect.poll(() => filter.selectedChipLabels()).toEqual(["Trending"]);

    await filter.chip("Gaming").click();
    await expect.poll(() => filter.selectedChipLabels()).toEqual(["Gaming"]);
  });

  // At a desktop viewport the chip row must overflow (we render 23 chips).
  // Forward chevron should be present; back chevron should not (scrollLeft=0).
  test("chevrons reflect initial scroll state", async ({ filter }) => {
    const metrics = await filter.scrollMetrics();
    expect(metrics.scrollWidth).toBeGreaterThan(metrics.clientWidth);

    await expect(filter.forwardButton).toBeVisible();
    await expect(filter.backButton).toHaveCount(0);
  });

  // Forward chevron advances scrollLeft and brings the back chevron in.
  test("forward chevron scrolls right and reveals back chevron", async ({ filter }) => {
    const before = await filter.scrollMetrics();
    await filter.forwardButton.click();
    await expect.poll(async () => (await filter.scrollMetrics()).scrollLeft).toBeGreaterThan(before.scrollLeft);
    await expect(filter.backButton).toBeVisible();
  });

  // Scrolling all the way to the end hides the forward chevron and leaves
  // only the back chevron visible.
  test("scrolling to the end hides the forward chevron", async ({ filter }) => {
    await filter.scrollContainer.evaluate((el) => {
      el.scrollLeft = el.scrollWidth;
    });
    await expect(filter.backButton).toBeVisible();
    await expect(filter.forwardButton).toHaveCount(0);
  });

  // Back chevron walks the scroll position back toward zero.
  test("back chevron scrolls left toward zero", async ({ filter }) => {
    await filter.scrollContainer.evaluate((el) => {
      el.scrollLeft = el.scrollWidth;
    });
    const before = await filter.scrollMetrics();
    await filter.backButton.click();
    await expect.poll(async () => (await filter.scrollMetrics()).scrollLeft).toBeLessThan(before.scrollLeft);
  });

  // Mouse drag on the chip row scrolls the container the same way YouTube
  // does. Dragging left (negative dx) increases scrollLeft.
  test("dragging the chip row scrolls horizontally", async ({ filter }) => {
    const before = await filter.scrollMetrics();
    await filter.dragHorizontally(-200);
    const after = await filter.scrollMetrics();
    expect(after.scrollLeft).toBeGreaterThan(before.scrollLeft);
  });

  // A drag must not also select the chip the pointer happened to release on.
  // suppressClickAfterDrag enforces this by stopping the post-drag click.
  // NOT polled, deliberately, unlike its neighbours: this asserts the selection did NOT move,
  // and a poll would happily retry until a navigation it is supposed to catch had settled.
  test("drag does not select a chip", async ({ filter }) => {
    await expect.poll(() => filter.selectedChipLabels()).toEqual(["All"]);
    await filter.dragHorizontally(-200);
    expect(await filter.selectedChipLabels()).toEqual(["All"]);
  });

  // After a normal click without dragging, the chip must still become
  // selectable — i.e. the drag suppression must reset between gestures.
  test("click still works after a prior drag", async ({ filter }) => {
    await filter.dragHorizontally(-150);
    await filter.chip("Gaming").click();
    await expect.poll(() => filter.selectedChipLabels()).toEqual(["Gaming"]);
  });

  // Layout invariant 1: chip row stays on a single line. We assert the
  // container's offsetHeight matches the h-14 class (56px). If chips wrapped,
  // the container would grow taller.
  test("chips stay on a single row (h-14 = 56px)", async ({ filter }) => {
    const height = await filter.scrollContainer.evaluate((el) => el.clientHeight);
    expect(height).toBe(56);
  });

  // Layout invariant 2: each chip's bounding rectangle is within the
  // container's vertical bounds. Guards against chips overflowing the row.
  test("every chip stays inside the row vertically", async ({ filter }) => {
    const containerBox = await filter.scrollContainer.boundingBox();
    if (!containerBox) throw new Error("scroll container has no bounding box");
    const chipBoxes = await filter.chips().evaluateAll((nodes) => nodes.map((n) => n.getBoundingClientRect()));
    for (const box of chipBoxes) {
      expect(box.top).toBeGreaterThanOrEqual(containerBox.y - 1);
      expect(box.bottom).toBeLessThanOrEqual(containerBox.y + containerBox.height + 1);
    }
  });

  // Layout invariant 3: the chip row does not horizontally exceed the
  // <main> region — `min-w-0` on main + overflow-x-auto on the container
  // is what keeps the chip row from blowing out the page width.
  test("chip row does not exceed the main region width", async ({ filter, page }) => {
    const mainBox = await page.locator("main").first().boundingBox();
    const filterBox = await filter.scrollContainer.boundingBox();
    if (!mainBox || !filterBox) throw new Error("missing bounding box");
    expect(filterBox.width).toBeLessThanOrEqual(mainBox.width + 1);
  });

  // Selection persists across scrolling: scrolling the row must not reset
  // the currently chosen chip.
  test("selection persists when the row is scrolled", async ({ filter }) => {
    await filter.chip("Trending").click();
    await expect.poll(() => filter.selectedChipLabels()).toEqual(["Trending"]);
    await filter.forwardButton.click();
    await expect.poll(async () => (await filter.scrollMetrics()).scrollLeft).toBeGreaterThan(0);
    await expect.poll(() => filter.selectedChipLabels()).toEqual(["Trending"]);
  });
});
