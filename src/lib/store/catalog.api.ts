// TRANSPORT: server-fetch — every read here is public and is awaited by a server
// component. `RequestOptions` is threaded anyway so a client island can call one later
// without the signature changing.
//
// WIRED. Every read below calls the Express backend. The fixtures these used to resolve
// are gone from this file; the path, the schema and the return type never changed, which
// is what the previous header promised and is why nothing above this file moved.
//
// `src/lib/store.ts` is the OLD path and is NOT a model for this file. Its getters return
// `T | null` and silently substitute mocks when a fetch fails, which makes "the backend is
// down" and "there is no such category" the same value. Everything here returns
// `ActionResponse` and the pages branch on it.

import { buildQueryString, getJson, type ActionResponse, type RequestOptions } from "@/lib/http";
import {
  StoreCategoryDetailSchema,
  StoreCategoryListSchema,
  StoreSearchPageSchema,
  type CategoryDetailFilter,
  type CategoryListFilter,
  type StoreCategory,
  type StoreCategoryDetail,
  type StoreSearchFilter,
  type StoreSearchPage,
  StoreProductCardPageSchema,
  type ListBookmarkedProductsFilter,
  type StoreProductCardPage,
} from "@/lib/store/catalog.schemas";

/**
 * Active categories: roots when `parentCategoryId` is omitted, one level of children when
 * it is given.
 *
 * `limit` is applied IN SQL, not here. The store home rail asks for eight, and asking the
 * server for eight is what makes the admin's `siblingOrder` decide which eight — fetching
 * the tree and slicing it in the browser would turn that arrangement into a suggestion.
 *
 * Otherwise unpaginated: the tree is bounded and staff-authored. Ordering is the server's
 * `siblingOrder`; never re-sort the result.
 */
export function listStoreCategories(
  filter: CategoryListFilter = {},
  options?: RequestOptions,
): Promise<ActionResponse<{ items: StoreCategory[] }>> {
  const path = `/store/categories${buildQueryString({ ...filter })}`;
  return getJson(path, StoreCategoryListSchema, options);
}

/**
 * One category with its children, its facets and the first page of its products.
 *
 * A `draft` or `retired` category is a **404**, identical to one that never existed. Do
 * not render a "retired category" state from a 404 — the two are indistinguishable on
 * purpose, so a stranger cannot probe which slugs exist.
 *
 * NOTE THE SHAPE: `products` is a keyset page, not a set of rails. Paging means echoing
 * `page.nextCursor` back as `?cursor=`, so the next page is a URL and never a client-side
 * slice of a fetched array.
 */
export function getStoreCategory(
  categorySlug: string,
  filter: CategoryDetailFilter = {},
  options?: RequestOptions,
): Promise<ActionResponse<StoreCategoryDetail>> {
  const path = `/store/categories/${categorySlug}${buildQueryString({ ...filter })}`;
  return getJson(path, StoreCategoryDetailSchema, options);
}

/**
 * Product and provider-offering search, filtered and ranked IN POSTGRES.
 *
 * `StoreSearchFilter` matches `SearchQuerySchema` key for key, and that schema is
 * `.strict()`: a key the backend does not accept is a **422**, not an ignored param. The
 * chips a page offers are therefore exactly those keys and no more — a control that errors
 * is worse than a control that is missing.
 *
 * `sort` has two values that never blend. `relevance` reads `ts_rank_cd` and never the
 * ranking score; `discovery` reads the ranking score and never `ts_rank_cd`.
 */
export function searchStore(
  filter: StoreSearchFilter = {},
  options?: RequestOptions,
): Promise<ActionResponse<StoreSearchPage>> {
  const path = `/store/search${buildQueryString({ ...filter })}`;
  return getJson(path, StoreSearchPageSchema, options);
}

/**
 * The caller's own wishlist — `GET /commerce/bookmarked-products` (A11).
 *
 * THIS ROUTE WAS BUILT FOR `/wishlist` AND DID NOT EXIST BEFORE. The toggles have shipped since
 * Phase 13 and nothing ever listed what they produced: a buyer could mark two hundred products and
 * had no route that would tell them which. The per-product counters were readable; the set was not
 * readable at all.
 *
 * BOOKMARKS ONLY, AND LIKES ARE NOT MISSING FROM IT — they were never a list. This was
 * `/saved-products` with a `kind` whose absence meant BOTH, so a heart tap put a product here
 * beside the ones the buyer actually meant to keep. A like is a public counter and nothing else.
 *
 * A PAGE CAN COME BACK SHORTER THAN ITS LIMIT, and that is correct rather than a bug. The rows are
 * resolved through `resolveEligibleProductCardsByIds`, which drops anything no longer eligible —
 * unpublished, hidden by a moderator, or belonging to an organization that stopped trading. A
 * wishlist is not a licence to keep rendering a listing the store has withdrawn.
 */
export function listBookmarkedProducts(
  filter: ListBookmarkedProductsFilter = {},
  options?: RequestOptions,
): Promise<ActionResponse<StoreProductCardPage>> {
  const path = `/commerce/bookmarked-products${buildQueryString({ ...filter })}`;
  return getJson(path, StoreProductCardPageSchema, options);
}
