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
import type { PaginationMeta } from "@/lib/http";
import type { ProblemCluster, ProblemClusterSort } from "@/lib/rnd/discovery.schemas";
import { PROBLEM_CLUSTER_SORTS } from "@/lib/rnd/discovery.schemas";
import type { ViewportBoundsMicrodegrees } from "@/lib/rnd/map-viewport";

/**
 * The sort the backend applies when `?sort=` is absent, mirrored from
 * `ListProblemClustersQuerySchema`'s `.default("opportunity")`.
 *
 * ⚠️ **IT IS WRITTEN OUT OF THE URL, NOT INTO IT** — the `?view=business` precedent. Selecting
 * Opportunity returns to the canonical `/research-and-development/problem-map` rather than pinning
 * a parameter that means what the absence already meant.
 */
export const DEFAULT_PROBLEM_CLUSTER_SORT: ProblemClusterSort = "opportunity";

/** What each sort answers, in the reader's words rather than the enum's. */
const PROBLEM_CLUSTER_SORT_LABELS: Record<ProblemClusterSort, string> = {
  opportunity: "Opportunity",
  recent: "Most recent",
  reporters: "Most reporters",
};

/** One entry of a filter vocabulary — the shape both `/research-categories` and `/regions` return. */
export interface ProblemMapFilterOption {
  readonly slug: string;
  readonly displayLabel: string;
}

/**
 * What the list beside the map is showing.
 *
 * ⚠️ **THREE EMPTINESSES, NOT ONE**, and telling them apart is most of the point of this union.
 * "Nothing has been clustered yet" recruits a reporter, "nothing matches these filters" asks for a
 * filter to be cleared, and "nothing in this view" asks for a zoom — and giving a reader the wrong
 * one of those tells them to fix something that is not broken. A `hasMatches` boolean beside an
 * `isFiltered` boolean is exactly the bag of flags CLAUDE.md Pattern 1 rules out, because it can
 * hold two of these at once.
 */
export type ProblemMapListState =
  | { readonly status: "error"; readonly message: string }
  | { readonly status: "loading" }
  | { readonly status: "emptyColdStart" }
  | { readonly status: "emptyFiltered" }
  | { readonly status: "emptyViewport" }
  | {
      readonly status: "ready";
      readonly clusters: ProblemCluster[];
      /**
       * The SERVER's count, from `pagination.total` — not `clusters.length`.
       *
       * ⚠️ The endpoint is offset-paginated with a capped `limit`, so at a wide zoom the page is a
       * prefix of the answer. Printing the row count as "in view" would be a number the reader can
       * disprove by zooming in and watching it go up.
       */
      readonly totalCount: number;
    };

export function toProblemMapListState(input: {
  readonly isError: boolean;
  readonly rows: ProblemCluster[] | undefined;
  readonly pagination: PaginationMeta | null | undefined;
  readonly hasAnyCluster: boolean;
  readonly hasAnyClusterMatchingFilters: boolean;
  readonly viewportBounds: ViewportBoundsMicrodegrees | null;
}): ProblemMapListState {
  if (input.isError) return { status: "error", message: "Couldn't load the problem map." };
  if (input.rows === undefined) return { status: "loading" };

  if (input.rows.length > 0) {
    return {
      status: "ready",
      clusters: input.rows,
      totalCount: input.pagination === null ? input.rows.length : (input.pagination?.total ?? 0),
    };
  }

  // Nothing anywhere beats every other reading of zero.
  if (!input.hasAnyCluster) return { status: "emptyColdStart" };

  /**
   * ⚠️ **"DOES THIS FILTER MATCH ANYTHING ANYWHERE" IS A FACT, NOT A GUESS ABOUT THE BOX.**
   *
   * An earlier cut asked how WIDE the viewport was and called a wide one "the whole world", on the
   * theory that a reader looking at the planet has nothing left to zoom out to. Measured, that was
   * wrong: the default camera renders a 629x269 canvas showing 180 deg of longitude and 68 deg of
   * latitude, so it never came close to any sane threshold — and a filter matching nothing anywhere
   * told the reader to zoom out, which would have done nothing for them however far they took it.
   *
   * The server page reads the same filters UNBOUNDED, so whether the filter matches anything is
   * something we are holding rather than something to infer from geometry.
   */
  if (!input.hasAnyClusterMatchingFilters) return { status: "emptyFiltered" };
  if (input.viewportBounds !== null) return { status: "emptyViewport" };

  // Unreachable: with no viewport this query IS the unbounded one, so it cannot return zero rows
  // while that same read reported matches. Named rather than thrown so the union stays total.
  return { status: "emptyFiltered" };
}

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

  const sortChips: FilterChipOption[] = PROBLEM_CLUSTER_SORTS.map((sort) => ({
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
