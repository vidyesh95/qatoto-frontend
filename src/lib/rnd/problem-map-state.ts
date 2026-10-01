import type { PaginationMeta } from "@/lib/http";
import type { ProblemCluster } from "@/lib/rnd/discovery.schemas";
import type { ViewportBoundsMicrodegrees } from "@/lib/rnd/map-viewport";

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
