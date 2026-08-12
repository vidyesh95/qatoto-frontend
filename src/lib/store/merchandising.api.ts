// TRANSPORT: server-fetch — all four reads are public and awaited by server components.
//
// WIRED. All four read the Express backend; `src/mocks/store/merchandising-mocks.ts` is deleted
// rather than kept as a fallback, because a silent fallback on a merchandising surface fabricates
// which products the platform is promoting.
//
// THE THREE PATHWAY/RAIL READS SHARE ONE QUERY SHAPE — `CursorPageQuerySchema`, `.strict()` over
// `limit` and `cursor` alone. Their filter types carry exactly those two keys, so there is no third
// key any of them could send that would not be a 422.

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
  return getJson(path, StorePathwayIndexPageSchema, options);
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
  const path = `/store/pathways/${encodeURIComponent(pathwaySlug)}${buildQueryString({ ...filter })}`;
  return getJson(path, StorePathwaySetSchema, options);
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
  const path = `/store/rails/${encodeURIComponent(railSlug)}${buildQueryString({ ...filter })}`;
  return getJson(path, StoreRailPageSchema, options);
}

// Imported for the wiring lines above; referenced so it is not dropped while reads are mock-backed.
void getJson;
