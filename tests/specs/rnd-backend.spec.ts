import { test, expect } from "../fixtures/test-base";
import { requireBackend } from "../fixtures/require-backend";

// Covers the /research-and-development surface against the REAL Express backend, signed out.
//
// The sibling of `store-backend.spec.ts`, and the same rules apply: contract-shaped assertions
// only, because the database is the shared Aiven instance; and signed out, because signing in
// would write a `session` row to it on every run.
//
// WHAT MAKES THIS SURFACE DIFFERENT FROM THE STORE is partial degradation. R&D mixes public
// reads with `requireAuth` ones ON THE SAME PAGE — `/team-building` serves a real roles grid
// beside a talent spotlight that cannot be served anonymously, and `/talent` inverts it. Those
// two tests are the reason this file exists separately rather than as more cases in the store's.
//
// NOTE THERE IS NO PAGINATION TEST HERE. R&D has no `CursorPageControl` call sites at all — its
// directories print a "{total} · showing page {n}" line instead. A "Show more" test here would
// pass by finding nothing, which is the failure mode this suite is trying to avoid.

test.beforeAll(requireBackend);

/**
 * The public R&D routes and the `<h1>` each one leads with.
 *
 * ⚠️ EVERY NAME BELOW IS THE PAGE'S OWN HEADING, WHICH IS NOT THE ROUTE'S TITLE. The navbar
 * renders a second `<h1>` holding the short title, and on three of these routes the two differ
 * only in wording or case — `/programs` serves "Research Programmes" in the navbar and
 * "Research programmes" in the page, and `/problem-map` and `/talent` serve the SAME string
 * twice. `SurfacePage` scopes to `main`, which is what keeps these unambiguous.
 */
const PUBLIC_RND_ROUTES: { readonly path: string; readonly headingName: string }[] = [
  { path: "/research-and-development", headingName: "From concept to consumer." },
  { path: "/research-and-development/problem-map", headingName: "Problem Map" },
  { path: "/research-and-development/market-research", headingName: "Market Research" },
  {
    path: "/research-and-development/go-to-market",
    headingName: "From verified build to a live listing.",
  },
  {
    path: "/research-and-development/governance",
    headingName: "Every rupee and every share, accounted for.",
  },
  { path: "/research-and-development/programs", headingName: "Research programmes" },
  {
    path: "/research-and-development/team-building",
    headingName: "Trade your skills for a stake.",
  },
  { path: "/research-and-development/talent", headingName: "Talent" },
];

test.describe("R&D — public routes", () => {
  for (const { path, headingName } of PUBLIC_RND_ROUTES) {
    test(`${path} loads and renders its own heading`, async ({ page, surface }) => {
      const response = await page.goto(path);
      expect(response?.status()).toBeLessThan(400);
      await expect(surface.heading(1, headingName)).toBeVisible();
    });
  }
});

test.describe("R&D — landing rails degrade independently", () => {
  // THE HIGHEST-VALUE TEST ON THIS PAGE, because the live database currently exercises BOTH
  // branches at once: research-projects has rows and market-insights has none. So one rail proves
  // the populated path and the other proves the empty path, in the same run, against real data.
  //
  // Only the two rails whose cards have an unambiguous href prefix are asserted this way. The
  // other two ("Top reported gaps", "Join a team") render a mix of links and sheet triggers, and
  // a locator loose enough to catch both would also catch the section's own "See all" chevron —
  // which would make the rail look populated when it is empty.
  const LANDING_RAILS = [
    {
      headingName: "Featured projects",
      cardHrefPrefix: "/research-and-development/project/",
      emptyCopy: "No published projects yet.",
    },
    {
      headingName: "Market insights",
      cardHrefPrefix: "/research-and-development/market-research/insight/",
      emptyCopy: "No market insights published yet.",
    },
  ];

  for (const { headingName, cardHrefPrefix, emptyCopy } of LANDING_RAILS) {
    test(`the ${headingName} rail shows cards or says it is empty`, async ({ page, surface }) => {
      await page.goto("/research-and-development");
      await expect(surface.heading(2, headingName)).toBeVisible();

      const cards = surface.linksTo(cardHrefPrefix);
      const emptyPanel = surface.statusMessage(emptyCopy);

      await expect.poll(async () => (await cards.count()) + (await emptyPanel.count())).toBeGreaterThan(0);

      // The disjunction is asserted WITH its exclusion — a rail rendering cards and an empty
      // panel at the same time is a broken branch, not a populated rail.
      if ((await cards.count()) > 0) {
        await expect(emptyPanel).toHaveCount(0);
      } else {
        await expect(emptyPanel).toBeVisible();
      }
    });
  }

  test("a featured project card opens its project page", async ({ page, surface }) => {
    await page.goto("/research-and-development");

    const projectCards = surface.linksTo("/research-and-development/project/");
    await expect.poll(async () => projectCards.count()).toBeGreaterThan(0);
    const href = await projectCards.first().getAttribute("href");

    const response = await page.goto(href ?? "");
    expect(response?.status()).toBeLessThan(400);
    await expect(surface.heading(1)).toBeVisible();
  });

  // ⚠️ THERE IS DELIBERATELY NO "unknown slug returns 404" TEST. `project-detail.tsx:61` really
  // does call `notFound()` on a 404 from the backend, but under `cacheComponents` the static
  // shell has already flushed by then, so Next cannot set the status line — the route answers
  // 200 and streams the not-found UI in afterwards. Asserting 404 here would fail against
  // correct behaviour. The equivalent assertion that IS honest lives in `store-backend.spec.ts`,
  // where the store ships its own not-found component with in-repo copy to match on.
});

test.describe("R&D — problem map", () => {
  test("renders the map with one pressable pin per cluster", async ({ page, surface }) => {
    await page.goto("/research-and-development/problem-map");

    await expect(surface.main.getByRole("img", { name: "World map of reported problems" })).toBeVisible();

    // Each pin is a real `<button aria-pressed>` positioned over the map, not an SVG node — so
    // the map is reachable by role rather than only by pixel.
    const pins = surface.main.locator("button[aria-pressed]");
    await expect.poll(async () => pins.count()).toBeGreaterThan(0);
  });

  test("selecting a pin marks it pressed and reveals the cluster link", async ({ page, surface }) => {
    await page.goto("/research-and-development/problem-map");

    const pins = surface.main.locator("button[aria-pressed]");
    await expect.poll(async () => pins.count()).toBeGreaterThan(0);

    // Nothing is selected before a click — otherwise the assertion below cannot distinguish
    // "selection happened" from "selection was already there".
    await expect(surface.main.locator('button[aria-pressed="true"]')).toHaveCount(0);

    // ⚠️ `.first()` IS THE POINT OF THIS TEST, NOT AN ARBITRARY CHOICE. This click used to time
    // out with the browser reporting that a neighbouring pin's image "intercepts pointer
    // events": two clusters 35km apart projected onto the same pixel, and the one drawn second
    // covered the first, so the first was unclickable. `layOutMapPins`
    // (`src/lib/rnd/map-pin-layout.ts`) now fans a colliding group out around its shared centre.
    // Clicking the FIRST pin — the one that used to be underneath — is what proves that holds.
    const firstPin = pins.first();
    await firstPin.click();

    await expect(firstPin).toHaveAttribute("aria-pressed", "true");
    // SINGLE-SELECT: picking a pin must not leave another one pressed.
    await expect(surface.main.locator('button[aria-pressed="true"]')).toHaveCount(1);
    await expect(surface.main.getByRole("link", { name: "Open this cluster →" })).toBeVisible();
  });

  test("a category chip re-queries through the URL", async ({ page, surface }) => {
    await page.goto("/research-and-development/problem-map");

    const categoryChips = surface.chips("Filter by category");
    await expect.poll(async () => categoryChips.count()).toBeGreaterThan(1);

    // Chip 0 is "All"; chip 1 is the first real category. Clicking by index rather than by name
    // keeps this off the category rows, which are data.
    const chipLabel = (await categoryChips.nth(1).textContent())?.trim() ?? "";
    await categoryChips.nth(1).click();

    await expect.poll(() => page.url()).toContain("category=");
    await expect.poll(() => surface.selectedChipLabels("Filter by category")).toEqual([chipLabel]);
  });
});

test.describe("R&D — market research", () => {
  test("tabs track the ?tab= parameter", async ({ page, surface }) => {
    await page.goto("/research-and-development/market-research");

    const tabRow = surface.main.getByRole("navigation", { name: "Market research sections" });
    await expect(tabRow).toBeVisible();

    // Each tab's accessible name is its title CONCATENATED with a description span, so these
    // match on a prefix. An exact name would fail against markup that is doing nothing wrong.
    const overviewTab = tabRow.getByRole("link", { name: /^Overview/ });
    const demandTab = tabRow.getByRole("link", { name: /^Reported demand/ });
    const importTab = tabRow.getByRole("link", { name: /^Import substitution/ });

    await expect(overviewTab).toHaveAttribute("aria-current", "page");
    await expect(demandTab).not.toHaveAttribute("aria-current", "page");
    await expect(importTab).not.toHaveAttribute("aria-current", "page");

    await demandTab.click();
    await expect.poll(() => page.url()).toContain("tab=demand");
    await expect(tabRow.getByRole("link", { name: /^Reported demand/ })).toHaveAttribute("aria-current", "page");
  });
});

test.describe("R&D — go-to-market", () => {
  test("an empty supplier directory still renders its filters", async ({ page, surface }) => {
    await page.goto("/research-and-development/go-to-market");
    await expect(surface.heading(2, "Manufacturing & ODM partners")).toBeVisible();

    // AN EMPTY LIST MUST NOT EAT ITS OWN FILTERS. A visitor who filters into a dead end needs the
    // controls that got them there in order to get back out; a directory that renders its empty
    // panel INSTEAD OF the chip rows is a trap. The suppliers table happens to be empty on this
    // database, which is what makes this assertable at all.
    await expect(surface.filterRow("Filter by capability")).toBeVisible();
    await expect(surface.filterRow("Filter by region")).toBeVisible();
    await expect(surface.filterRow("Filter by verification status")).toBeVisible();

    const supplierCards = surface.linksTo("/research-and-development/go-to-market/supplier/");
    const emptyPanel = surface.statusMessage("No partner matches these filters yet.");

    await expect.poll(async () => (await supplierCards.count()) + (await emptyPanel.count())).toBeGreaterThan(0);

    if ((await supplierCards.count()) === 0) await expect(emptyPanel).toBeVisible();
  });
});

test.describe("R&D — governance", () => {
  test("the commitments table renders its columns, and no caller lines", async ({ page, surface }) => {
    await page.goto("/research-and-development/governance");
    await expect(surface.heading(2, "Commitments and statements, project by project")).toBeVisible();

    // `.first()` because the page renders a SECOND table — the worked-example statement, which
    // CLAUDE.md names as the one piece of authored data left on this surface. Its columns are
    // Member/Line/Amount/Payment, so an unscoped column query would mix the two.
    const commitmentsTable = surface.main.getByRole("table").first();
    for (const column of [
      "Project",
      "Committed",
      "Open",
      "Finalized",
      "Countersigned",
      "Superseded",
      "Backer confidence",
    ]) {
      await expect(commitmentsTable.getByRole("columnheader", { name: column })).toBeVisible();
    }

    // `caller-open-lines.tsx:38` returns null when there are no lines, and a signed-out caller
    // has none. This asserts the page does not render an empty personal section to a visitor who
    // cannot have one — the aggregates are public, the personal slice is not.
    await expect(surface.main.getByText("Your own open lines")).toHaveCount(0);
  });
});

test.describe("R&D — partial degradation", () => {
  // The pattern that is unique to this surface: ONE PAGE, BOTH BRANCHES, AT THE SAME TIME. These
  // two tests are mirror images — each asserts that the public half still served real rows while
  // the `requireAuth` half degraded to a panel. A regression that made a page all-or-nothing
  // (gating the whole route, or leaking the gated section) fails exactly one of them.

  test("/team-building serves real roles beside a gated talent spotlight", async ({ page, surface }) => {
    await page.goto("/research-and-development/team-building");

    // Public half: `GET /open-roles`.
    await expect(surface.heading(2, "Open roles across every project")).toBeVisible();
    await expect(surface.filterRow("Filter by commitment")).toBeVisible();

    // Gated half: `GET /discovery/talent` is requireAuth. Asserted on the panel's exact MESSAGE
    // rather than on a "Sign in" link, because more than one such link renders inside `main` on
    // this page and the message is what identifies which section degraded.
    await expect(surface.statusMessage("Sign in to see people looking for a team.")).toBeVisible();
  });

  test("/talent gates the directory but still serves the open-roles rail", async ({ page, surface }) => {
    await page.goto("/research-and-development/talent");

    await expect(
      surface.statusMessage(
        "Sign in to browse the talent directory. Profiles are opt-in, so we only show them to signed-in members.",
      ),
    ).toBeVisible();

    // The public rail on the same page is untouched by the gate above it.
    await expect(surface.heading(2, "Join a team")).toBeVisible();
    await expect(surface.main.getByRole("link", { name: "See all Join a team" })).toBeVisible();
  });
});

test.describe("R&D — programmes", () => {
  test("searching narrows the index through the URL", async ({ page, surface }) => {
    await page.goto("/research-and-development/programs");
    await expect(surface.heading(2, "All programmes")).toBeVisible();

    // The visible label is an `sr-only` span, so the searchbox is reachable by accessible name
    // even though nothing is drawn beside it.
    await surface.main.getByRole("searchbox", { name: "Search research programmes" }).fill("immortal");
    await surface.main.getByRole("button", { name: "Search" }).click();

    await expect.poll(() => page.url()).toContain("q=immortal");
    // Curly quotes — the literal the component renders.
    await expect(surface.heading(2, "Results for “immortal”")).toBeVisible();
  });

  test("a programme card opens its programme page", async ({ page, surface }) => {
    await page.goto("/research-and-development/programs");

    // `/programs/new` is the "Propose a programme" call to action, not a programme — excluded so
    // this cannot pass by following it.
    const programmeCards = surface.linksTo("/research-and-development/programs/").filter({ hasNotText: "Propose" });
    const hrefs = (await surface.hrefsOf(programmeCards)).filter(
      (href) => href !== "/research-and-development/programs/new",
    );
    expect(hrefs.length).toBeGreaterThan(0);

    const response = await page.goto(hrefs[0]);
    expect(response?.status()).toBeLessThan(400);
    await expect(surface.heading(1)).toBeVisible();
  });
});
