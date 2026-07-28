// TRANSPORT: server-fetch — server component. Reads GET /discovery/problem-clusters and
// GET /research-categories via @/lib/rnd/*.api, with the session cookie forwarded by
// callerRequestOptions(). Both are public. The canvas below is a client island holding
// pin/card selection only.
import FilterChipRow, {
  type FilterChipOption,
} from "@/components/home/research-and-development/sections/filter-chip-row";
import ProblemMapCanvas from "@/components/home/research-and-development/sections/problem-map-canvas";
import RndStatusPanel, {
  RndErrorPanel,
} from "@/components/home/research-and-development/sections/rnd-status-panel";
import ReportProblemSheet from "@/components/home/research-and-development/sheets/report-problem-sheet";
import { listResearchCategories } from "@/lib/rnd/catalog.api";
import { listProblemClusters } from "@/lib/rnd/discovery.api";
import { buildFilterHref, readSingleParam, type RawSearchParams } from "@/lib/rnd/filter-href";
import { rowsOrEmpty, toListViewState } from "@/lib/rnd/view-state";
import { callerRequestOptions } from "@/lib/server-http";

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
  const requestOptions = await callerRequestOptions();
  const selectedCategorySlug = readSingleParam(resolvedSearchParams, "category");

  const [clustersResult, categoriesResult] = await Promise.all([
    listProblemClusters(
      { sort: "opportunity", limit: CLUSTERS_PAGE_LIMIT, category: selectedCategorySlug },
      requestOptions,
    ),
    listResearchCategories({ status: "approved" }, requestOptions),
  ]);

  const clustersState = toListViewState(clustersResult);
  // Secondary read: losing it costs the chips, not the map.
  const categoryOptions = rowsOrEmpty(categoriesResult);

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

      <div className="flex flex-wrap justify-between gap-2">
        {categoryOptions.length > 0 ? (
          <FilterChipRow options={categoryChips} ariaLabel="Filter by category" />
        ) : (
          <span />
        )}
        <ReportProblemSheet />
      </div>

      {renderCanvas()}
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
              selectedCategorySlug === undefined
                ? "No problems have been clustered yet."
                : "No clusters in this category yet."
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
