import { test, expect } from "../fixtures/test-base";
import { requireBackend } from "../fixtures/require-backend";

// Covers the /store surface against the REAL Express backend, signed out.
//
// This is the first spec in the suite that does not isolate itself from the network, and that is
// the point: /store is one of the two surfaces CLAUDE.md calls fully wired, so its failure modes
// live exactly where a Vitest test cannot reach — streaming under `cacheComponents`, filter and
// cursor round-trips that go through the URL, and the signed-out degradation path.
//
// ⚠️ ASSERTIONS ARE CONTRACT-SHAPED, NEVER VALUE-SHAPED, and the reason is the database. There is
// no local Postgres — `.env` in the backend repo points at a SHARED Aiven instance that other
// people and two seed scripts write to. `press-list.spec.ts` can assert the literal string
// "Qatoto launches Build Console v2" because that row lives in this repo as a fixture; nothing
// here may do the same. So: href SHAPES, counts, `aria-current` movement, and the empty-state
// copy — which is an in-repo constant, not data.
//
// SIGNED OUT ON PURPOSE. Every route below is served by `storeRouter` behind `attachOptionalUser`,
// so an anonymous visitor gets real rows. Signing in would mint a `session` row in that shared
// database on every run, which is a write this suite has no business making.

test.beforeAll(requireBackend);

/**
 * The public store routes and the heading each one leads with.
 *
 * THE LEVEL VARIES AND THAT IS NOT AN OVERSIGHT. `/store` and `/store/business` have no
 * page-level `<h1>` at all — they open with `SectionHeader`'s `<h2>` — and `/store/categories`
 * does the same. A single `getByRole("heading", { level: 1 })` sweep would have to skip them, and
 * skipping is how a page that renders nothing keeps passing.
 */
const PUBLIC_STORE_ROUTES: {
  readonly path: string;
  readonly headingLevel: 1 | 2;
  readonly headingName: string;
}[] = [
  { path: "/store", headingLevel: 2, headingName: "Categories" },
  { path: "/store/categories", headingLevel: 2, headingName: "Categories" },
  { path: "/store/search", headingLevel: 1, headingName: "Search the store" },
  { path: "/store/factories", headingLevel: 1, headingName: "Factories worldwide" },
  { path: "/store/providers", headingLevel: 1, headingName: "Trade services" },
  { path: "/store/pathways", headingLevel: 1, headingName: "Pathways" },
  { path: "/store/forum", headingLevel: 1, headingName: "Business forum" },
  { path: "/store/find-cofounder", headingLevel: 1, headingName: "Find a cofounder" },
  { path: "/store/business", headingLevel: 2, headingName: "For your Business" },
];

test.describe("store — public routes", () => {
  for (const { path, headingLevel, headingName } of PUBLIC_STORE_ROUTES) {
    test(`${path} loads and renders its own heading`, async ({ page, surface }) => {
      const response = await page.goto(path);
      expect(response?.status()).toBeLessThan(400);

      // Scoped to `main` by SurfacePage. `/store/pathways` renders the string "Pathways" TWICE
      // as an `<h1>` — once in the navbar's mobile title and once as the page heading — so an
      // unscoped query there is ambiguous by construction rather than by accident.
      await expect(surface.heading(headingLevel, headingName)).toBeVisible();
    });
  }
});

test.describe("store — home rails", () => {
  // Every rail is a `SectionHeader`, which renders an `<h2>` and a chevron link labelled
  // `See all ${title}` (src/components/home/store/sections/section-header.tsx:15-23). The pairing
  // is the contract: a rail whose "See all" points nowhere is a dead end the eye does not catch.
  //
  // The rail TITLES are backend-driven (merchandising rails are rows), so they are read off the
  // page rather than listed here.
  test("every rail heading has a working See all link", async ({ page, surface }) => {
    await page.goto("/store");
    await expect(surface.heading(2, "Categories")).toBeVisible();

    const railTitles = (await surface.heading(2).allTextContents()).map((title) => title.trim());
    expect(railTitles.length).toBeGreaterThan(0);

    for (const title of railTitles) {
      const seeAllLink = surface.main.getByRole("link", { name: `See all ${title}` });
      await expect(seeAllLink).toBeVisible();

      const href = await seeAllLink.getAttribute("href");
      expect(href).toBeTruthy();

      // Follow it over HTTP rather than clicking: this asserts the destination exists, and
      // clicking nine rails in sequence would assert that plus eight navigations nobody asked
      // about.
      const destination = await page.request.get(href ?? "");
      expect(destination.status()).toBeLessThan(400);
    }
  });
});

test.describe("store — categories", () => {
  test("the index lists category links, or says it is empty", async ({ page, surface }) => {
    await page.goto("/store/categories");

    const categoryCards = surface.linksTo("/store/categories/");
    const emptyPanel = surface.statusMessage("No categories are published yet.");

    // Wait for ONE OF THE TWO to arrive. Under `cacheComponents` the static shell flushes before
    // the read resolves, so a bare count() here reads the skeleton and reports zero of both.
    await expect.poll(async () => (await categoryCards.count()) + (await emptyPanel.count())).toBeGreaterThan(0);

    const cardCount = await categoryCards.count();

    // THE DISJUNCTION IS ASSERTED WITH ITS EXCLUSION, not on its own. "Cards or empty panel" alone
    // is satisfied by a page that renders both, which is precisely what a broken empty-state
    // branch looks like; and the shared database really can go from populated to empty, so the
    // branch that runs today is not the branch that runs forever.
    if (cardCount > 0) {
      await expect(emptyPanel).toHaveCount(0);
      for (const href of await surface.hrefsOf(categoryCards)) {
        expect(href).toMatch(/^\/store\/categories\/[a-z0-9-]+$/);
      }
    } else {
      await expect(emptyPanel).toBeVisible();
    }
  });

  test("a category page carries its own heading and a breadcrumb trail", async ({ page, surface }) => {
    await page.goto("/store/categories");

    const firstCategory = surface.linksTo("/store/categories/").first();
    await expect(firstCategory).toBeVisible();
    const href = await firstCategory.getAttribute("href");

    await page.goto(href ?? "");

    // The name itself is a row, so assert that the heading exists and is not blank rather than
    // what it says.
    await expect(surface.heading(1)).toBeVisible();
    await expect(surface.heading(1)).not.toHaveText("");

    // `catalog-breadcrumb.tsx:36` — the trail is what makes a nested category escapable.
    await expect(surface.main.getByRole("navigation", { name: "Category trail" })).toBeVisible();
  });
});

test.describe("store — search", () => {
  test("the heading reflects whether a query was given", async ({ page, surface }) => {
    await page.goto("/store/search");
    await expect(surface.heading(1, "Search the store")).toBeVisible();

    await page.goto("/store/search?query=a");
    // CURLY quotes — the component renders typographic quotes, and this is the literal the page
    // serves. Straight quotes here would fail against correct markup.
    await expect(surface.heading(1, "Results for “a”")).toBeVisible();
  });

  test("result rows link to a product, a service or an organization", async ({ page, surface }) => {
    await page.goto("/store/search?query=a");
    await expect(surface.heading(1, "Results for “a”")).toBeVisible();

    const resultRows = surface.main.locator("ul > li a[href^='/store/']");
    await expect.poll(async () => resultRows.count()).toBeGreaterThan(0);

    for (const href of await surface.hrefsOf(resultRows)) {
      expect(href).toMatch(/^\/store\/(product|services|organizations)\/[^/]+$/);
    }
  });

  test("a filter chip re-queries the backend through the URL", async ({ page, surface }) => {
    await page.goto("/store/search?query=a");

    // "All results" is the default and must already be the row's selection before anything is
    // clicked — otherwise the assertion below cannot tell "selection moved" from "selection was
    // always there".
    await expect.poll(() => surface.selectedChipLabels("Filter by result type")).toEqual(["All results"]);

    await surface.chips("Filter by result type").filter({ hasText: "Products" }).click();

    // Polling, not a one-shot read: selecting a chip is a NAVIGATION. `filter.spec.ts:8-13`
    // records the same trap — the click resolves when the anchor activates, while the selection
    // only changes once the new server render lands.
    await expect.poll(() => page.url()).toContain("documentKind=product");

    // SINGLE-SELECT IS THE INVARIANT. Exactly one chip carries `aria-current`; a row showing two
    // selected filters is showing a state the backend was never asked for.
    await expect.poll(() => surface.selectedChipLabels("Filter by result type")).toEqual(["Products"]);
  });

  test("Show more advances the keyset cursor to a different page", async ({ page, surface }) => {
    // /store/search is used deliberately: of the paginated store lists it is the one that
    // currently returns `hasMore: true` at the page's own limit. Factories and providers hold a
    // single row each, so their control does not render at all and a test aimed there would pass
    // by finding nothing.
    await page.goto("/store/search?query=a");

    const resultRows = surface.main.locator("ul > li a[href^='/store/']");
    await expect.poll(async () => resultRows.count()).toBeGreaterThan(0);
    const firstPageHrefs = await surface.hrefsOf(resultRows);

    await surface.nextPageLink("Show more results").click();

    await expect.poll(() => page.url()).toContain("cursor=");
    await expect.poll(async () => (await surface.hrefsOf(resultRows))[0]).not.toBe(firstPageHrefs[0]);

    // NEXT-ONLY BY CONTRACT (cursor-page-control.tsx:43). A keyset cursor encodes one direction;
    // a "previous" control appearing here would mean someone reached for offset paging.
    await expect(surface.main.getByRole("link", { name: /^Show previous/ })).toHaveCount(0);
  });
});

test.describe("store — signed-out gating", () => {
  // The session-scoped surfaces. What is asserted is that they GATE IN PLACE rather than
  // redirect: there is no `src/middleware.ts` and no route guard in this repo, so the URL must
  // still be the one that was requested. A future middleware that bounced these to /sign-in
  // would break the deep links this suite is fixing in place.
  const SESSION_SCOPED_STORE_ROUTES = [
    "/store/rfqs",
    "/store/forum/mine",
    "/store/find-cofounder/mine",
    "/store/factory-inquiries",
  ];

  for (const path of SESSION_SCOPED_STORE_ROUTES) {
    test(`${path} shows a sign-in panel without redirecting`, async ({ page, surface }) => {
      const response = await page.goto(path);
      expect(response?.status()).toBeLessThan(400);

      // Scoped to `main`, which matters here more than anywhere: the navbar's signed-out account
      // cluster renders its own "Sign in" link on every one of these pages, and an unscoped query
      // would pass on a page whose panel never rendered at all.
      await expect(surface.signInPanelLink()).toBeVisible();
      await expect(page).toHaveURL(new RegExp(`${path}$`));
    });
  }
});

test.describe("store — redirect shims", () => {
  // ⚠️ THESE ARE NOT 308s AND MUST NOT BE ASSERTED AS ONE. Under `cacheComponents` a redirect
  // from a page component cannot emit a redirect header — the static shell has already flushed —
  // so Next falls back to `<meta http-equiv="refresh">` and the browser lands after a visible
  // pause. This is measured and written up at `src/app/(home)/store/[...slug]/page.tsx:25-30`.
  // Asserting the landing URL is therefore the only honest assertion available.
  const REDIRECT_SHIMS = [
    { from: "/store/some-unknown-segment", to: "/store/categories/some-unknown-segment" },
    { from: "/store/pathway/some-unknown-id", to: "/store/pathways/some-unknown-id" },
  ];

  for (const { from, to } of REDIRECT_SHIMS) {
    test(`${from} resolves to ${to}`, async ({ page }) => {
      await page.goto(from);
      // The meta refresh carries a one-second delay, so this needs more than the 5s default
      // across three browsers.
      await expect(page).toHaveURL(new RegExp(`${to}$`), { timeout: 15_000 });
    });
  }
});

test.describe("store — not found", () => {
  // ⚠️ THE STATUS LINE IS 200 HERE AND THAT IS CORRECT. `product-detail.tsx` calls `notFound()`
  // when the backend answers 404, but under `cacheComponents` the static shell has already
  // flushed by then, so Next cannot go back and set a 404 status — it streams the not-found UI
  // in instead. Asserting `status() === 404` would fail against behaviour that is working as
  // designed, so what is asserted is the COPY, which the store owns in-repo
  // (`src/components/home/store/store-not-found.tsx:9`) rather than inheriting from Next.
  test("an unknown product renders the store's own not-found copy", async ({ page }) => {
    await page.goto("/store/product/definitely-not-a-real-product");
    await expect(page.getByRole("heading", { name: "We couldn't find that" })).toBeVisible({ timeout: 15_000 });
  });
});
