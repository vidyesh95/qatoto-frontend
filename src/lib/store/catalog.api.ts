import { buildQueryString, getJson, type ActionResponse, type RequestOptions } from "@/lib/http";
import {
  OrganizationStorefrontSchema,
  PublicStoreProductSchema,
  StoreCategoryDetailSchema,
  StoreCategoryListSchema,
  StoreHomeSchema,
  StorePathwayDetailSchema,
  StorePathwayListSchema,
  StoreSearchResultSchema,
  type OrganizationStorefront,
  type PublicStoreProduct,
  type StoreCategoryDetail,
  type StoreCategoryList,
  type StoreCursorPageFilter,
  type StoreHome,
  type StorePathwayDetail,
  type StorePathwayList,
  type StoreSearchFilter,
  type StoreSearchResult,
} from "@/lib/store/catalog.schemas";

/**
 * One function per public `/store/*` route that this frontend actually renders.
 * Failures are tagged `ActionResponse` values — never silent mock fallback.
 *
 * Every query schema on these routes is `.strict()`, so a key the backend does not declare
 * is a 422 rather than an ignored field. Only send what is listed in
 * `src/controllers/store.controller.ts`.
 *
 * `/store/providers`, `/store/providers/:organizationSlug`, `/store/services/:offeringSlug`
 * and `/store/rails/:railSlug` are shipped backend-side but have no page here yet, so they
 * have no function here either — an api wrapper with no caller is unverified code.
 */

export function fetchStoreHome(options?: RequestOptions): Promise<ActionResponse<StoreHome>> {
  return getJson("/store/home", StoreHomeSchema, options);
}

/**
 * Active categories, roots by default.
 *
 * The filter is `parentCategoryId` — an opaque ID, NOT a slug. There is no slug-scoped
 * variant, so a caller holding only a slug must read the category first.
 */
export function fetchStoreCategories(
  parentCategoryId?: string,
  options?: RequestOptions,
): Promise<ActionResponse<StoreCategoryList>> {
  const queryString = buildQueryString({ parentCategoryId });
  return getJson(`/store/categories${queryString}`, StoreCategoryListSchema, options);
}

/** One category with its children, facets, and first product page. Accepts `limit`/`cursor` only. */
export function fetchStoreCategory(
  categorySlug: string,
  filter: StoreCursorPageFilter = {},
  options?: RequestOptions,
): Promise<ActionResponse<StoreCategoryDetail>> {
  const queryString = buildQueryString({ limit: filter.limit, cursor: filter.cursor });
  return getJson(
    `/store/categories/${encodeURIComponent(categorySlug)}${queryString}`,
    StoreCategoryDetailSchema,
    options,
  );
}

/** Mixed product + provider-offering search. `sort` is `relevance` or absent; there is no other. */
export function fetchStoreSearch(
  filter: StoreSearchFilter,
  options?: RequestOptions,
): Promise<ActionResponse<StoreSearchResult>> {
  const queryString = buildQueryString({
    query: filter.query,
    category: filter.category,
    sellerCountryCode: filter.sellerCountryCode,
    providerKind: filter.providerKind,
    documentKind: filter.documentKind,
    minOrderQuantityMax: filter.minOrderQuantityMax,
    sort: filter.sort,
    cursor: filter.cursor,
    limit: filter.limit,
  });
  return getJson(`/store/search${queryString}`, StoreSearchResultSchema, options);
}

export function fetchStoreProduct(
  productSlug: string,
  options?: RequestOptions,
): Promise<ActionResponse<PublicStoreProduct>> {
  return getJson(
    `/store/products/${encodeURIComponent(productSlug)}`,
    PublicStoreProductSchema,
    options,
  );
}

export function fetchOrganizationStorefront(
  organizationSlug: string,
  filter: StoreCursorPageFilter = {},
  options?: RequestOptions,
): Promise<ActionResponse<OrganizationStorefront>> {
  const queryString = buildQueryString({ limit: filter.limit, cursor: filter.cursor });
  return getJson(
    `/store/organizations/${encodeURIComponent(organizationSlug)}${queryString}`,
    OrganizationStorefrontSchema,
    options,
  );
}

/** Every active pathway. Unpaginated and takes no query params. */
export function fetchStorePathways(
  options?: RequestOptions,
): Promise<ActionResponse<StorePathwayList>> {
  return getJson("/store/pathways", StorePathwayListSchema, options);
}

/** One pathway and all of its items. Also unpaginated — there is no cursor to pass. */
export function fetchStorePathway(
  pathwaySlug: string,
  options?: RequestOptions,
): Promise<ActionResponse<StorePathwayDetail>> {
  return getJson(
    `/store/pathways/${encodeURIComponent(pathwaySlug)}`,
    StorePathwayDetailSchema,
    options,
  );
}
