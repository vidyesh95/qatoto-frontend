import { test, expect } from "../fixtures/test-base";

// Tests for getPressItem via the /press/[slug] route.
// Covers: mock-data hit, mock-data fallback for listing, and unknown-slug 404.

const MOCK_SLUGS: { slug: string; title: string; kind: string }[] = [
  {
    slug: "qatoto-launches-build-console-v2",
    title: "Qatoto launches Build Console v2 with AI blocker triage",
    kind: "Release",
  },
  {
    slug: "project-immortal-research-grants",
    title: "Project Immortal opens its first cohort of research grants",
    kind: "Announcement",
  },
];

test.describe("getPressItem — press detail page", () => {
  for (const { slug, title, kind } of MOCK_SLUGS) {
    test(`/press/${slug} loads with correct title and kind badge`, async ({ page }) => {
      const resp = await page.goto(`/press/${slug}`);
      expect(resp?.status()).toBeLessThan(400);

      await expect(page.getByRole("heading", { level: 1 })).toContainText(title);
      await expect(page.getByText(kind, { exact: true })).toBeVisible();
    });
  }

  test("/press/[slug] shows related items (getPressList fallback active)", async ({ page }) => {
    await page.goto("/press/qatoto-launches-build-console-v2");
    const heading = page.getByRole("heading", { name: "More updates" });
    await expect(heading).toBeVisible();
    const cards = page.locator('a[href^="/press/"]').filter({ hasNotText: "← All updates" });
    await expect(cards).toHaveCount(3); // 4 total minus the current item
  });

  test("/press/unknown-slug returns 404", async ({ page }) => {
    const resp = await page.goto("/press/this-slug-does-not-exist");
    expect(resp?.status()).toBe(404);
  });
});
