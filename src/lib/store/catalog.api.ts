// TRANSPORT: server-fetch — every read here is public and is awaited by a server
// component. `RequestOptions` is threaded anyway so a client island can call one later
// without the signature changing.
//
// MOCK-BACKED: every read below resolves a fixture. To wire one, swap `resolveMockRead`
// for `getJson` and drop the fixture argument for `options` — the path, the schema and the
// return type are already final, so nothing above this file changes.
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
} from "@/lib/store/catalog.schemas";
import { resolveMockDetail, resolveMockRead } from "@/lib/store/mock-transport";
import {
  MOCK_CATEGORY_DETAILS_BY_SLUG,
  MOCK_ROOT_CATEGORY_LIST,
  MOCK_SEARCH_PAGE,
} from "@/mocks/store/catalog-mocks";

/**
 * Active categories: roots when `parentCategoryId` is omitted, one level of children when
 * it is given.
 *
 * Unpaginated — the tree is bounded and staff-authored. Ordering is the server's
 * `siblingOrder`; never re-sort the result.
 */
export function listStoreCategories(
  filter: CategoryListFilter = {},
  options?: RequestOptions,
): Promise<ActionResponse<{ items: StoreCategory[] }>> {
  const path = `/store/categories${buildQueryString({ ...filter })}`;
  return resolveMockRead(path, StoreCategoryListSchema, options, MOCK_ROOT_CATEGORY_LIST);
  // return getJson(path, StoreCategoryListSchema, options);
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
  return resolveMockDetail(
    path,
    StoreCategoryDetailSchema,
    options,
    MOCK_CATEGORY_DETAILS_BY_SLUG,
    categorySlug,
  );
  // return getJson(path, StoreCategoryDetailSchema, options);
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
  return resolveMockRead(path, StoreSearchPageSchema, options, MOCK_SEARCH_PAGE);
  // return getJson(path, StoreSearchPageSchema, options);
}

// `getJson` is imported for the wiring lines above, which are the point of this file
// existing in this shape. Referenced here so the import is not dropped as unused while
// every read is still mock-backed.
void getJson;
