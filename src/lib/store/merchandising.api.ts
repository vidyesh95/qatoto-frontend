// TRANSPORT: server-fetch — all three reads are public and awaited by server components.
//
// MOCK-BACKED: every read below resolves a fixture. To wire one, swap `resolveMockRead` for
// `getJson` and drop the fixture argument for `options`.

import { buildQueryString, getJson, type ActionResponse, type RequestOptions } from "@/lib/http";
import {
  StorePathwayIndexPageSchema,
  StorePathwaySetSchema,
  StoreRailPageSchema,
  type PathwayIndexFilter,
  type PathwaySetFilter,
  type RailPageFilter,
  type StorePathwayIndexPage,
  type StorePathwaySet,
  type StoreRailPage,
} from "@/lib/store/merchandising.schemas";
import { resolveMockDetail, resolveMockRead } from "@/lib/store/mock-transport";
import {
  MOCK_PATHWAY_INDEX_PAGE,
  MOCK_PATHWAY_SETS_BY_SLUG,
  MOCK_RAIL_PAGES_BY_SLUG,
} from "@/mocks/store/merchandising-mocks";

/**
 * Active pathways, cursor-paginated over `(title, id)`.
 *
 * Replaces a Phase 1 read that returned every active pathway with no limit and no cursor.
 */
export function listStorePathways(
  filter: PathwayIndexFilter = {},
  options?: RequestOptions,
): Promise<ActionResponse<StorePathwayIndexPage>> {
  const path = `/store/pathways${buildQueryString({ ...filter })}`;
  return resolveMockRead(path, StorePathwayIndexPageSchema, options, MOCK_PATHWAY_INDEX_PAGE);
  // return getJson(path, StorePathwayIndexPageSchema, options);
}

/**
 * One pathway as a SET: slots, ranked candidates, per-currency totals and completeness.
 *
 * The cursor pages over SLOTS, not products — a 200-piece kit used to be one unbounded response.
 *
 * `completeness` is computed over every slot rather than the page, so "3 of 5 pieces available"
 * stays true on page two. Read it rather than counting the slots you were handed.
 */
export function getStorePathway(
  pathwaySlug: string,
  filter: PathwaySetFilter = {},
  options?: RequestOptions,
): Promise<ActionResponse<StorePathwaySet>> {
  const path = `/store/pathways/${pathwaySlug}${buildQueryString({ ...filter })}`;
  return resolveMockDetail(
    path,
    StorePathwaySetSchema,
    options,
    MOCK_PATHWAY_SETS_BY_SLUG,
    pathwaySlug,
  );
  // return getJson(path, StorePathwaySetSchema, options);
}

/**
 * One curated or ranked feed.
 *
 * `rail.strategy` decides where the items came from, and one value is special:
 * `trending_placeholder` returns an EMPTY LIST unconditionally and always will. A rail carrying it
 * is not broken — render it as empty. Never treat an empty rail as a failed read.
 */
export function getStoreRail(
  railSlug: string,
  filter: RailPageFilter = {},
  options?: RequestOptions,
): Promise<ActionResponse<StoreRailPage>> {
  const path = `/store/rails/${railSlug}${buildQueryString({ ...filter })}`;
  return resolveMockDetail(path, StoreRailPageSchema, options, MOCK_RAIL_PAGES_BY_SLUG, railSlug);
  // return getJson(path, StoreRailPageSchema, options);
}

// Imported for the wiring lines above; referenced so it is not dropped while reads are mock-backed.
void getJson;
