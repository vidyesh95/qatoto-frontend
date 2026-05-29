import { test, expect } from "../fixtures/test-base";

// Tests for getPressList via the /press route.
// Test env has no QATOTO_CMS_URL, so the MOCK_PRESS fallback path is exercised.
// page.tsx sorts items by publishedAt descending before rendering.

// MOCK_PRESS in publishedAt-descending order (the order page.tsx renders).
const EXPECTED_ORDER: { slug: string; title: string }[] = [
  {
    slug: "qatoto-launches-build-console-v2",
    title: "Qatoto launches Build Console v2 with AI blocker triage",
  },
  {
    slug: "project-immortal-research-grants",
    title: "Project Immortal opens its first cohort of research grants",
  },
  {
    slug: "civic-problem-map-india-pilot",
    title: "Civic problem map enters India pilot with three state partners",
  },
  {
    slug: "qatoto-store-clears-100-shipped-products",
    title: "Qatoto Store crosses 100 shipped products",
  },
];

test.describe("getPressList — press listing page", () => {
  test("/press renders every mock item (fallback path)", async ({ page }) => {
    const resp = await page.goto("/press");
    expect(resp?.status()).toBeLessThan(400);

    const cards = page.locator('ol li a[href^="/press/"]');
    await expect(cards).toHaveCount(EXPECTED_ORDER.length);

    for (const { slug, title } of EXPECTED_ORDER) {
      const card = page.locator(`ol li a[href="/press/${slug}"]`);
      await expect(card).toBeVisible();
      await expect(card.getByRole("heading", { level: 2 })).toContainText(title);
    }
  });

  test("/press orders items newest-first", async ({ page }) => {
    await page.goto("/press");

    const hrefs = await page.locator('ol li a[href^="/press/"]').evaluateAll((els) =>
      els.map((el) => el.getAttribute("href")),
    );
    expect(hrefs).toEqual(EXPECTED_ORDER.map(({ slug }) => `/press/${slug}`));
  });
});
