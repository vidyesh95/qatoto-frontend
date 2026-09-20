// TRANSPORT: server-fetch — server component. Reads GET /discovery/problem-clusters (twice, see
// below), GET /research-categories and GET /discovery/regions via @/lib/rnd/*.api, with the
// session cookie forwarded by callerRequestOptions(). All are public. The canvas below is now a
// `client-query` island: it re-reads the cluster list for its own viewport and this page's read is
// the seed that paints before that lands.
import FilterChipRow, {
  type FilterChipOption,
} from "@/components/home/research-and-development/sections/filter-chip-row";
import MyProblemReportsPanel from "@/components/home/research-and-development/sections/my-problem-reports-panel";
import ProblemMapCanvas from "@/components/home/research-and-development/sections/problem-map-canvas";
import ReportProblemSheet from "@/components/home/research-and-development/sheets/report-problem-sheet";
import { listResearchCategories } from "@/lib/rnd/catalog.api";
import { listDiscoveryRegions, listProblemClusters } from "@/lib/rnd/discovery.api";
import { buildFilterHref, readSingleParam, type RawSearchParams } from "@/lib/filter-href";
import { readMapCameraFromSearchParams } from "@/lib/rnd/map-viewport";
import { rowsOrEmpty } from "@/lib/view-state";
import { callerRequestOptions, hasCallerSession } from "@/lib/server-http";

// The map shows pins, not a feed. A page is bounded because a deep offset on a public
// unauthenticated read is a scan amplifier. The island re-reads with this same limit plus the
// map's bounding box, so both halves ask for the same page size and the count readout cannot
// disagree with itself between the server paint and the first client read.
const CLUSTERS_PAGE_LIMIT = 50;

/**
 * Problem Map (Civic Pulse).
 *
 * Clusters are fetched and ranked BY THE SERVER (`?sort=opportunity`), and the category
 * chips are Links that set `?category=` for the next request. Filtering used to happen in
 * the canvas over an in-memory array, which cannot survive pagination: a predicate over
 * one fetched page silently reports a fraction of the matches as the whole answer.
 *
 * The chips come from `GET /research-categories?status=approved` — the approved taxonomy —
 * rather than from the categories present on the fetched page, which would only ever
 * offer the ones already visible.
 *
 * ⚠️ **THE CHIPS STAY SERVER-RENDERED `Link`s EVEN THOUGH THE LIST IS NOW CLIENT-FETCHED**, and
 * that combination works for one specific reason: `buildFilterHref` carries every key it does not
 * recognise straight through, so `?lat`, `?lng` and `?z` survive a chip navigation and the
 * remounted map reopens on the camera the reader left it at. Rebuilding the chips as client
 * controls would buy nothing and would move a filter the server already applies onto the client.
 */
export default async function ProblemMapPage({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  const resolvedSearchParams = await searchParams;
  // Proposing a category needs a real account, so the sheet is told rather than left to
  // discover it from a 401 on a button it should not have offered.
  const [requestOptions, isSignedIn] = await Promise.all([
    callerRequestOptions(),
    hasCallerSession(),
  ]);
  const selectedCategorySlug = readSingleParam(resolvedSearchParams, "category");
  const selectedRegionSlug = readSingleParam(resolvedSearchParams, "region");
  const initialCamera = readMapCameraFromSearchParams(resolvedSearchParams);

  const [clustersResult, anyClusterProbeResult, categoriesResult, regionsResult] =
    await Promise.all([
      listProblemClusters(
        {
          sort: "opportunity",
          limit: CLUSTERS_PAGE_LIMIT,
          category: selectedCategorySlug,
          region: selectedRegionSlug,
        },
        requestOptions,
      ),
      /**
       * ⚠️ **THE SECOND READ EXISTS TO TELL COLD START FROM "NOTHING HERE", AND IT CANNOT BE
       * DERIVED FROM THE FIRST.** Every other read on this surface is filtered, viewport-scoped or
       * both, so zero rows is an ambiguous answer: a platform with no clusters at all and a reader
       * looking at an empty stretch of ocean return the identical response. The three empty states
       * the surface owes a reader (`todo.md` §19.4) need one unfiltered fact, and one row is
       * enough to establish it.
       */
      listProblemClusters({ limit: 1 }, requestOptions),
      listResearchCategories({ status: "approved" }, requestOptions),
      listDiscoveryRegions({}, requestOptions),
    ]);

  /**
   * ⚠️ **A FAILED PROBE READS AS "THERE IS DATA", NOT AS COLD START.** The two are not symmetric:
   * claiming nothing has ever been reported when the read merely failed tells a founder the
   * platform is empty and tells a reporter they are first, both wrongly. Assuming data exists
   * costs at worst the filter or viewport message, which is recoverable by looking.
   */
  const hasAnyCluster = anyClusterProbeResult.success
    ? anyClusterProbeResult.data.pagination.total > 0
    : true;

  /**
   * The seed the island paints before its own first read lands.
   *
   * A failed read hands over `null` pagination rather than a fabricated empty page, which is what
   * tells the island not to seed its cache with an answer the server never got. The island then
   * reads for itself and renders its own error state — better than this page rendering one, since
   * a transient server-side failure need not cost the reader the whole map.
   */
  // Read off the result directly rather than through `rowsOrEmpty`: that helper takes a bare-array
  // read, and this is a paginated one whose `data` is `{ rows, pagination }`. The two are read
  // together here anyway, so splitting them through a helper would not shorten anything.
  const initialClusters = clustersResult.success ? clustersResult.data.rows : [];
  const initialPagination = clustersResult.success ? clustersResult.data.pagination : null;
  /**
   * Whether the current filters match anything at all, ignoring the map.
   *
   * ⚠️ **THIS READ IS UNBOUNDED AND THAT IS THE WHOLE POINT.** It is what lets the island say "no
   * clusters match these filters" instead of "zoom out to see more" — advice that would be true
   * only if the matches existed somewhere else. A failed read reads as "there are matches", the
   * same direction the cold-start probe errs in and for the same reason: overstating emptiness is
   * the more misleading of the two mistakes.
   */
  const hasAnyClusterMatchingFilters = clustersResult.success
    ? clustersResult.data.pagination.total > 0
    : true;

  // Secondary reads: losing either costs a chip row, not the map.
  const categoryOptions = rowsOrEmpty(categoriesResult);
  const regionOptions = rowsOrEmpty(regionsResult);

  const categoryChips: FilterChipOption[] = [
    {
      label: "All",
      href: buildFilterHref(resolvedSearchParams, { category: undefined }),
      isSelected: selectedCategorySlug === undefined,
    },
    ...categoryOptions.map((category) => ({
      label: category.displayLabel,
      href: buildFilterHref(resolvedSearchParams, { category: category.slug }),
      isSelected: selectedCategorySlug === category.slug,
    })),
  ];

  // The region vocabulary comes from `GET /discovery/regions`, NOT from the regions
  // present on the fetched page. A chip row derived from the page can only ever offer
  // the regions already on screen, so it never lets a visitor reach the ones that are
  // not — which is the whole job of a filter.
  const regionChips: FilterChipOption[] = [
    {
      label: "Everywhere",
      href: buildFilterHref(resolvedSearchParams, { region: undefined }),
      isSelected: selectedRegionSlug === undefined,
    },
    ...regionOptions.map((region) => ({
      label: region.displayLabel,
      href: buildFilterHref(resolvedSearchParams, { region: region.slug }),
      isSelected: selectedRegionSlug === region.slug,
    })),
  ];

  // Built here rather than in the island because this is where the rest of the query string is
  // already in hand: it drops both filters and keeps the camera, so clearing a filter does not
  // also throw away where the reader was looking.
  const clearFiltersHref = buildFilterHref(resolvedSearchParams, {
    category: undefined,
    region: undefined,
  });

  return (
    <div className="space-y-6 px-4 pt-4 pb-4 lg:px-6 lg:pt-6 lg:pb-6">
      <div>
        {/* `docs/Design.md` §3, the Serif Boundary: a serif heading inside `(home)` is a bug, not a
            variation. This one and the cluster detail's were the two `todo.md` §19.11 names. */}
        <h1 className="text-2xl font-semibold md:text-3xl">Problem Map</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Civic Pulse — reported infrastructure gaps, mapped into opportunity.
        </p>
        {/* A pin is a CLUSTER of submissions from distinct people, and the opportunity
            score is computed on a schedule. Saying so stops a visitor reading a pin as
            one person's complaint, or a score as a live number. */}
        <p className="mt-1 text-sm text-muted-foreground">
          Each pin is a cluster of reports from separate people. Opportunity scores are recomputed
          on a schedule, so a brand-new cluster may not have one yet.
        </p>
      </div>

      <div className="space-y-2">
        <div className="flex flex-wrap justify-between gap-2">
          {categoryOptions.length > 0 ? (
            <FilterChipRow options={categoryChips} ariaLabel="Filter by category" />
          ) : (
            <span />
          )}
          <ReportProblemSheet canCreateCategory={isSignedIn} />
        </div>
        {regionOptions.length > 0 && (
          <FilterChipRow options={regionChips} ariaLabel="Filter by region" />
        )}
      </div>

      {/* ⚠️ **NO EMPTY OR ERROR BRANCH HERE ANY MORE.** This page used to switch on its own read and
          render one of two messages in the canvas's place, which had two defects the viewport made
          unignorable: it removed the map — the only control that can get a reader out of an empty
          view — and it could not distinguish the three ways a viewport-scoped read reaches zero.
          The island owns all of it now and keeps the map on screen underneath. */}
      <ProblemMapCanvas
        initialClusters={initialClusters}
        initialPagination={initialPagination}
        hasAnyCluster={hasAnyCluster}
        hasAnyClusterMatchingFilters={hasAnyClusterMatchingFilters}
        selectedCategorySlug={selectedCategorySlug}
        selectedRegionSlug={selectedRegionSlug}
        clearFiltersHref={clearFiltersHref}
        clustersPageLimit={CLUSTERS_PAGE_LIMIT}
        initialCamera={initialCamera}
      />
      <MyProblemReportsPanel />
    </div>
  );
}
