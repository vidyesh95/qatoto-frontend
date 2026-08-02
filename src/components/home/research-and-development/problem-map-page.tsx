// TRANSPORT: server-fetch — server component. Reads GET /discovery/problem-clusters,
// GET /research-categories and GET /discovery/regions via @/lib/rnd/*.api, with the
// session cookie forwarded by callerRequestOptions(). All three are public. The canvas
// below is a client island holding pin/card selection only.
import FilterChipRow, {
  type FilterChipOption,
} from "@/components/home/research-and-development/sections/filter-chip-row";
import MyProblemReportsPanel from "@/components/home/research-and-development/sections/my-problem-reports-panel";
import ProblemMapCanvas from "@/components/home/research-and-development/sections/problem-map-canvas";
import RndStatusPanel, {
  RndErrorPanel,
} from "@/components/home/research-and-development/sections/rnd-status-panel";
import ReportProblemSheet from "@/components/home/research-and-development/sheets/report-problem-sheet";
import { listResearchCategories } from "@/lib/rnd/catalog.api";
import { listDiscoveryRegions, listProblemClusters } from "@/lib/rnd/discovery.api";
import { buildFilterHref, readSingleParam, type RawSearchParams } from "@/lib/filter-href";
import { rowsOrEmpty, toListViewState } from "@/lib/view-state";
import { callerRequestOptions, hasCallerSession } from "@/lib/server-http";

// The map shows pins, not a feed. A page is bounded because a deep offset on a public
// unauthenticated read is a scan amplifier; a real viewport-scoped fetch (the backend
// takes a lat/lng bounding box) is what replaces this when the map gains pan and zoom.
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

  const [clustersResult, categoriesResult, regionsResult] = await Promise.all([
    listProblemClusters(
      {
        sort: "opportunity",
        limit: CLUSTERS_PAGE_LIMIT,
        category: selectedCategorySlug,
        region: selectedRegionSlug,
      },
      requestOptions,
    ),
    listResearchCategories({ status: "approved" }, requestOptions),
    listDiscoveryRegions({}, requestOptions),
  ]);

  const clustersState = toListViewState(clustersResult);
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

  return (
    <div className="space-y-6 px-4 pt-4 pb-4 lg:px-6 lg:pt-6 lg:pb-6">
      <div>
        <h1 className="font-serif text-2xl font-semibold md:text-3xl">Problem Map</h1>
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

      {renderCanvas()}
      <MyProblemReportsPanel />
    </div>
  );

  function renderCanvas() {
    switch (clustersState.status) {
      case "error":
        return <RndErrorPanel message="Couldn't load the problem map." />;
      case "empty":
        return (
          <RndStatusPanel
            message={
              selectedCategorySlug === undefined && selectedRegionSlug === undefined
                ? "No problems have been clustered yet."
                : "No clusters match these filters yet."
            }
          />
        );
      case "ready":
        return <ProblemMapCanvas clusters={clustersState.rows} />;
      default: {
        const exhaustiveCheck: never = clustersState;
        return exhaustiveCheck;
      }
    }
  }
}
