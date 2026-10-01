// TRANSPORT: props-only — every row, chip and count arrives from `problem-map-shell`, which owns
// the read. It builds hrefs and renders; it fetches nothing.
"use client";

import Link from "next/link";

import FilterChipRow, {
  type FilterChipOption,
} from "@/components/home/research-and-development/sections/filter-chip-row";
import ProblemClusterList from "@/components/home/research-and-development/sections/problem-report-list";
import RndStatusPanel, {
  RndErrorPanel,
} from "@/components/home/research-and-development/sections/rnd-status-panel";
import ReportProblemSheet from "@/components/home/research-and-development/sheets/report-problem-sheet";
import type { RawSearchParams } from "@/lib/filter-href";
import type { ProblemClusterSort } from "@/lib/rnd/discovery.schemas";
import { DEFAULT_PROBLEM_CLUSTER_SORT, PROBLEM_CLUSTER_SORTS } from "@/lib/rnd/discovery.schemas";
import type { ProblemMapFilterOption, ProblemMapListState } from "@/lib/rnd/problem-map-state";

/** What each sort answers, in the reader's words rather than the enum's. */
const PROBLEM_CLUSTER_SORT_LABELS: Record<ProblemClusterSort, string> = {
  opportunity: "Opportunity",
  recent: "Most recent",
  reporters: "Most reporters",
  // "Nearest" alone reads as the reader's OWN location, which this never asks for or uses — the
  // order is from the middle of the map they are looking at.
  distance: "Near map centre",
};

function formatClusterCountLabel(totalCount: number, hasViewport: boolean): string {
  const clusterNoun = totalCount === 1 ? "cluster" : "clusters";
  return hasViewport ? `${totalCount} ${clusterNoun} in view` : `${totalCount} ${clusterNoun}`;
}

type ProblemMapPanelProps = {
  readonly listState: ProblemMapListState;
  readonly selectedClusterId: string | null;
  readonly onSelectCluster: (clusterId: string) => void;
  readonly categoryOptions: readonly ProblemMapFilterOption[];
  readonly regionOptions: readonly ProblemMapFilterOption[];
  readonly selectedCategorySlug: string | undefined;
  readonly selectedRegionSlug: string | undefined;
  readonly selectedSort: ProblemClusterSort;
  readonly hasViewport: boolean;
  readonly canCreateCategory: boolean;
  /** True in the mobile bottom sheet, where the report trigger goes full width. */
  readonly isSheet: boolean;
  /**
   * Builds a URL for a filter change.
   *
   * ⚠️ **THE SHELL SUPPLIES IT BECAUSE ONLY THE SHELL KNOWS WHERE THE MAP IS LOOKING.** The camera
   * is written to the address bar client-side, so a server-built href carries whatever camera the
   * page was requested with — which after one pan is the wrong one. Part 1 shipped exactly that
   * bug: a chip click threw the reader's view away and refitted to the pins.
   */
  readonly buildFilterHrefFromLiveView: (patch: RawSearchParams) => string;
};

/**
 * The instrument's panel: what is on the map, in words, plus every control that changes it.
 *
 * ⚠️ **THIS IS THE KEYBOARD AND SCREEN-READER PATH FOR THE MAP**, which is why it is not optional
 * at any breakpoint and why the mobile sheet can never be collapsed out of existence. Every pin has
 * a row here and every row reaches the same record.
 *
 * ⚠️ **THE CHIPS ARE STILL `Link`s AND MUST STAY LINKS.** It would be easy, now that this is a
 * client component, to make them buttons that write the URL — and it would break two things.
 * `history.replaceState` does not re-run the server component, so a filter written that way would
 * never re-query; and `hasAnyClusterMatchingFilters`, the unbounded read that picks between the
 * empty states, would go stale the moment a filter changed. Links also keep middle-click and
 * open-in-new-tab, which `feed/filter.tsx:13` records as the reason chips are links at all.
 */
export default function ProblemMapPanel({
  listState,
  selectedClusterId,
  onSelectCluster,
  categoryOptions,
  regionOptions,
  selectedCategorySlug,
  selectedRegionSlug,
  selectedSort,
  hasViewport,
  canCreateCategory,
  isSheet,
  buildFilterHrefFromLiveView,
}: ProblemMapPanelProps) {
  const categoryChips: FilterChipOption[] = [
    {
      label: "All",
      href: buildFilterHrefFromLiveView({ category: undefined }),
      isSelected: selectedCategorySlug === undefined,
    },
    ...categoryOptions.map((category) => ({
      label: category.displayLabel,
      href: buildFilterHrefFromLiveView({ category: category.slug }),
      isSelected: selectedCategorySlug === category.slug,
    })),
  ];

  // The region vocabulary comes from `GET /discovery/regions`, NOT from the regions present on the
  // fetched page. A chip row derived from the page can only ever offer the regions already on
  // screen, so it never lets a visitor reach the ones that are not — which is the whole job of a
  // filter.
  const regionChips: FilterChipOption[] = [
    {
      label: "Everywhere",
      href: buildFilterHrefFromLiveView({ region: undefined }),
      isSelected: selectedRegionSlug === undefined,
    },
    ...regionOptions.map((region) => ({
      label: region.displayLabel,
      href: buildFilterHrefFromLiveView({ region: region.slug }),
      isSelected: selectedRegionSlug === region.slug,
    })),
  ];

  // "Near map centre" is offered only where there IS a map centre: the static SVG and the list-only
  // mode have no camera, so the order would have nothing to be near.
  const offeredSorts = PROBLEM_CLUSTER_SORTS.filter((sort) => sort !== "distance" || hasViewport);
  const sortChips: FilterChipOption[] = offeredSorts.map((sort) => ({
    label: PROBLEM_CLUSTER_SORT_LABELS[sort],
    href: buildFilterHrefFromLiveView({
      sort: sort === DEFAULT_PROBLEM_CLUSTER_SORT ? undefined : sort,
    }),
    isSelected: selectedSort === sort,
  }));

  function renderListBody() {
    switch (listState.status) {
      case "error":
        return <RndErrorPanel message={listState.message} />;
      case "loading":
        return <p className="text-sm text-muted-foreground">Loading clusters…</p>;
      case "emptyColdStart":
        return <RndStatusPanel message="No problems have been clustered yet." />;
      case "emptyFiltered":
        return (
          <RndStatusPanel
            message="No clusters match these filters."
            action={
              <Link
                href={buildFilterHrefFromLiveView({ category: undefined, region: undefined })}
                scroll={false}
                className="text-xs font-medium text-primary-imprint"
              >
                Clear filters
              </Link>
            }
          />
        );
      case "emptyViewport":
        return <RndStatusPanel message="No clusters in this view. Zoom out to see more." />;
      case "ready":
        return (
          <ProblemClusterList
            clusters={listState.clusters}
            selectedClusterId={selectedClusterId}
            onSelectCluster={onSelectCluster}
          />
        );
      default: {
        const exhaustiveCheck: never = listState;
        return exhaustiveCheck;
      }
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Header, chips and count do not scroll — only the rows do. A filter row that scrolls out
          of reach is a filter the reader has to hunt for to undo. */}
      <div className="shrink-0 space-y-2 px-4 pt-4">
        {/* Hidden under `md` because the mobile sub-header already reads "Problem Map" two
            centimetres above it, and in the sheet every fixed row costs the reader a row of the
            list. */}
        <p className="hidden text-xs font-medium tracking-wide text-muted-foreground md:block">
          PROBLEM MAP
        </p>

        {categoryOptions.length > 0 && (
          <FilterChipRow options={categoryChips} ariaLabel="Filter by category" />
        )}
        {regionOptions.length > 0 && (
          <FilterChipRow options={regionChips} ariaLabel="Filter by region" />
        )}

        <div className="space-y-1 border-t border-outline-variant/60 pt-2">
          {/* Zero renders nothing: the empty state below is already saying it, and "0 clusters in
              view" above "No clusters in this view" is the same sentence twice. */}
          {listState.status === "ready" && (
            <ClusterCountReadout
              totalCount={listState.totalCount}
              shownCount={listState.clusters.length}
              hasViewport={hasViewport}
            />
          )}
          <FilterChipRow options={sortChips} ariaLabel="Sort clusters" />
        </div>
      </div>

      {/* The one scrolling region on the whole surface.
          ⚠️ **THE STANDING NOTE LIVES HERE, NOT IN THE FIXED HEADER, AND THAT IS A DELIBERATE
          DEPARTURE FROM THE BRIEF.** `docs/PROBLEM_MAP_UX.md` §5 lists it among the header items,
          but §5 also requires the mobile peek detent to show the chips, the count and a row — and
          measured, those two cannot both be true: the note is two lines, and with it pinned the
          peek sheet pushed `Report a problem` off the bottom, which is the one control a reporter
          standing at the broken thing came for. It is context rather than a control, so it belongs
          with the content it describes. On a docked panel it is visible without scrolling anyway. */}
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
        <p className="mb-3 text-xs text-muted-foreground">
          Each pin is a cluster of reports from separate people. Opportunity scores are recomputed
          on a schedule, so a new cluster may not have one yet.
        </p>
        {renderListBody()}
      </div>

      {/* Pinned outside the scroll: on a phone this is the one thing a reporter standing at the
          broken thing came for, and it must not be below a list they have to scroll. */}
      <div className="shrink-0 border-t border-outline-variant/60 px-4 py-3">
        <ReportProblemSheet canCreateCategory={canCreateCategory} isTriggerFullWidth={isSheet} />
      </div>
    </div>
  );
}

/**
 * How many clusters the reader is being shown, and — when the page is a prefix — that it is one.
 *
 * ⚠️ **NOTHING HERE MAY ROUND OR SOFTEN THE TWO NUMBERS.** A capped page silently presented as the
 * whole answer is the defect this surface already records against its own history, one layer down:
 * a count over one fetched page reports a fraction of the matches as the total.
 */
function ClusterCountReadout({
  totalCount,
  shownCount,
  hasViewport,
}: {
  readonly totalCount: number;
  readonly shownCount: number;
  readonly hasViewport: boolean;
}) {
  const isPagePrefix = shownCount < totalCount;

  return (
    <p className="text-xs text-muted-foreground">
      {formatClusterCountLabel(totalCount, hasViewport)}
      {isPagePrefix && (
        <>
          {" · "}
          {hasViewport
            ? `Showing the top ${shownCount}. Zoom in to see the rest.`
            : `Showing the top ${shownCount}.`}
        </>
      )}
    </p>
  );
}
