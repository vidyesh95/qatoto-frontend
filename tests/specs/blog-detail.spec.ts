import { test, expect } from "../fixtures/test-base";

// Tests for getBlog via the /blogs/[slug] route.
// Test env has no QATOTO_CMS_URL, so the MOCK_BLOGS fallback path is exercised.
// Covers: mock-data hit (existing slug) and unknown-slug 404.

const MOCK_POSTS: { slug: string; title: string; category: string; author: string }[] = [
  {
    slug: "how-to-pitch-on-qatoto",
    title: "How to pitch an idea on Qatoto that attracts a team",
    category: "How-to",
    author: "Maya Iyer",
  },
  {
    slug: "five-tips-for-eod-updates",
    title: "Five tips for an EOD update that investors actually read",
    category: "Tips",
    author: "Ravi Bhatt",
  },
];

test.describe("getBlog — blog detail page", () => {
  for (const { slug, title, category, author } of MOCK_POSTS) {
    test(`/blogs/${slug} loads with title, category badge, author`, async ({ page }) => {
      const resp = await page.goto(`/blogs/${slug}`);
      expect(resp?.status()).toBeLessThan(400);

      await expect(page.getByRole("heading", { level: 1 })).toContainText(title);
      await expect(page.getByText(category, { exact: true })).toBeVisible();
      await expect(page.getByText(author, { exact: true })).toBeVisible();
    });
  }

  test("/blogs/[slug] shows related posts (getBlogs fallback active)", async ({ page }) => {
    await page.goto("/blogs/how-to-pitch-on-qatoto");
    await expect(page.getByRole("heading", { name: "Keep reading" })).toBeVisible();
    const related = page.locator('a[href^="/blogs/"]');
    await expect(related).toHaveCount(3); // 4 mock posts minus the current one
  });

  test("/blogs/unknown-slug returns 404", async ({ page }) => {
    const resp = await page.goto("/blogs/this-slug-does-not-exist");
    expect(resp?.status()).toBe(404);
  });
});
