// TRANSPORT: server-fetch — server component. Reads GET /discovery/problem-clusters (twice, see
// below), GET /research-categories and GET /discovery/regions via @/lib/rnd/*.api, with the session
// cookie forwarded by callerRequestOptions(). All are public. The shell below is a `client-query`
// island: it re-reads the cluster list for its own viewport and this page's read is the seed that
// paints before that lands.
import ProblemMapShell from "@/components/home/research-and-development/sections/problem-map-shell";
import { DEFAULT_PROBLEM_CLUSTER_SORT } from "@/components/home/research-and-development/sections/problem-map-panel";
import { listResearchCategories } from "@/lib/rnd/catalog.api";
import { listDiscoveryRegions, listProblemClusters } from "@/lib/rnd/discovery.api";
import { PROBLEM_CLUSTER_SORTS } from "@/lib/rnd/discovery.schemas";
import { readEnumParam, readSingleParam, type RawSearchParams } from "@/lib/filter-href";
import { readMapCameraFromSearchParams } from "@/lib/rnd/map-viewport";
import { rowsOrEmpty } from "@/lib/view-state";
import { callerRequestOptions, hasCallerSession } from "@/lib/server-http";

// The map shows pins, not a feed. A page is bounded because a deep offset on a public
// unauthenticated read is a scan amplifier. The island re-reads with this same limit plus the map's
// bounding box, so both halves ask for the same page size and the count readout cannot disagree
// with itself between the server paint and the first client read.
const CLUSTERS_PAGE_LIMIT = 50;

/**
 * Problem Map (Civic Pulse).
 *
 * ⚠️ **THE PAGE IS THE VIEWPORT AND DOES NOT SCROLL.** `h-full` and nothing else — no `calc`, no
 * chrome constant. `(home)/layout.tsx` is a fixed-height flex column whose `<main>` is the scroll
 * container, so "full" here means exactly what is left after the navbar and the alpha banner have
 * taken what they need, at every width. It used to be a document-scroll page with a 3fr/2fr
 * map-beside-list block in the middle, which on a phone put a 2000x857 canvas above a stack of
 * cards and asked the reader to scroll past the thing they came for.
 *
 * Clusters are fetched and ranked BY THE SERVER, and the chips are Links that set the query string
 * for the next request. Filtering used to happen in the canvas over an in-memory array, which
 * cannot survive pagination: a predicate over one fetched page silently reports a fraction of the
 * matches as the whole answer.
 *
 * ⚠️ **THE CHIP HREFS ARE BUILT BY THE ISLAND, NOT HERE**, which is why this passes the raw
 * vocabularies rather than finished `FilterChipOption`s. The camera is written to the address bar
 * client-side, so a href built from this component's `searchParams` carries whatever camera the
 * request arrived with — and after one pan that is a view the reader has left.
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
  // An unrecognised `?sort=` is DROPPED rather than forwarded — `readEnumParam` exists so a
  // hand-edited URL renders the default view instead of a 422 that blanks the page.
  const selectedSort =
    readEnumParam(resolvedSearchParams, "sort", PROBLEM_CLUSTER_SORTS) ??
    DEFAULT_PROBLEM_CLUSTER_SORT;
  const initialCamera = readMapCameraFromSearchParams(resolvedSearchParams);
  const initialSelectedClusterId = readSingleParam(resolvedSearchParams, "cluster") ?? null;

  const [clustersResult, anyClusterProbeResult, categoriesResult, regionsResult] =
    await Promise.all([
      listProblemClusters(
        {
          sort: selectedSort,
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
   * platform is empty and tells a reporter they are first, both wrongly. Assuming data exists costs
   * at worst the filter or viewport message, which is recoverable by looking.
   */
  const hasAnyCluster = anyClusterProbeResult.success
    ? anyClusterProbeResult.data.pagination.total > 0
    : true;

  /**
   * Whether the current filters match anything at all, ignoring the map. This read is UNBOUNDED and
   * that is the whole point: it is what lets the island say "no clusters match these filters"
   * instead of "zoom out to see more" — advice that would be true only if the matches existed
   * somewhere else. A failed read errs in the same direction as the probe above.
   */
  const hasAnyClusterMatchingFilters = clustersResult.success
    ? clustersResult.data.pagination.total > 0
    : true;

  // Read off the result directly rather than through `rowsOrEmpty`: that helper takes a bare-array
  // read, and this is a paginated one whose `data` is `{ rows, pagination }`.
  const initialClusters = clustersResult.success ? clustersResult.data.rows : [];
  const initialPagination = clustersResult.success ? clustersResult.data.pagination : null;

  // Secondary reads: losing either costs a chip row, not the map.
  const categoryOptions = rowsOrEmpty(categoriesResult).map((category) => ({
    slug: category.slug,
    displayLabel: category.displayLabel,
  }));
  const regionOptions = rowsOrEmpty(regionsResult).map((region) => ({
    slug: region.slug,
    displayLabel: region.displayLabel,
  }));

  return (
    <div className="h-full">
      {/* ⚠️ **THE HEADING IS VISUALLY HIDDEN, NOT DELETED.** In a page that does not scroll, an
          `h1` plus a description plus two standing notes cost 120px of the thing the reader came
          for — but the document still needs one heading and the route still needs an accessible
          name. The notes moved into the panel header, where they sit beside what they describe.

          `docs/Design.md` §3, the Serif Boundary: no `font-serif` here. A serif heading inside
          `(home)` is a bug, not a variation. */}
      <h1 className="sr-only">Problem Map — Civic Pulse</h1>

      <ProblemMapShell
        initialClusters={initialClusters}
        initialPagination={initialPagination}
        hasAnyCluster={hasAnyCluster}
        hasAnyClusterMatchingFilters={hasAnyClusterMatchingFilters}
        categoryOptions={categoryOptions}
        regionOptions={regionOptions}
        selectedCategorySlug={selectedCategorySlug}
        selectedRegionSlug={selectedRegionSlug}
        selectedSort={selectedSort}
        clustersPageLimit={CLUSTERS_PAGE_LIMIT}
        initialCamera={initialCamera}
        initialSelectedClusterId={initialSelectedClusterId}
        canCreateCategory={isSignedIn}
        serverSearchParams={resolvedSearchParams}
      />
    </div>
  );
}
