// TRANSPORT: server-fetch — all four reads are public and awaited by server components.
//
// PARTIALLY MOCK-BACKED: `getStoreHome` is WIRED. The three pathway/rail reads below still resolve
// a fixture. To wire one, swap `resolveMockRead` for `getJson` and drop the fixture argument for
// `options`.

import { buildQueryString, getJson, type ActionResponse, type RequestOptions } from "@/lib/http";
import {
  StoreHomeSchema,
  StorePathwayIndexPageSchema,
  StorePathwaySetSchema,
  StoreRailPageSchema,
  type PathwayIndexFilter,
  type PathwaySetFilter,
  type RailPageFilter,
  type StoreHome,
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
 * `GET /store/home` — hero slides, root categories, pathways, provider shortcuts and rails.
 *
 * WIRED. This replaces the legacy `getStoreHome` in `src/lib/store.ts`, which read a second env
 * var (`QATOTO_STORE_API_URL`) and fell back to a mock fixture when it was unset — so an
 * unconfigured deploy rendered fabricated merchandising and said nothing about it.
 *
 * A 503 here is real and specific: the home read fans out to the provider directory, and the
 * backend answers 503 rather than serving a home page with a silently empty shortcut rail.
 */
export function getStoreHome(options?: RequestOptions): Promise<ActionResponse<StoreHome>> {
  return getJson("/store/home", StoreHomeSchema, options);
}

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
