// TRANSPORT: props-only — URL → typed filter; no network.

import {
  buildFilterHref,
  readEnumParam,
  readSingleParam,
  type RawSearchParams,
} from "@/lib/filter-href";
import type { StoreSearchFilter } from "@/lib/store/catalog.schemas";
import {
  COMMERCE_PROVIDER_KINDS,
  STORE_SEARCH_DOCUMENT_KINDS,
  STORE_SEARCH_SORTS,
} from "@/lib/store/labels";

const MAXIMUM_SEARCH_LIMIT = 48;
const MAXIMUM_ORDER_QUANTITY_FILTER = 1_000_000;

function readBoundedIntParam(
  searchParams: RawSearchParams,
  key: string,
  minimum: number,
  maximum: number,
): number | undefined {
  const rawValue = readSingleParam(searchParams, key);
  if (rawValue === undefined) return undefined;
  const parsed = Number(rawValue);
  if (!Number.isInteger(parsed) || parsed < minimum || parsed > maximum) return undefined;
  return parsed;
}

/**
 * The backend regex is `/^[A-Z]{2}$/` under `.strict()`, so `?sellerCountryCode=in` is a
 * 422 that blanks the whole page. Upper-case what looks like a country code and drop
 * anything else — an unreadable filter value means "no filter", never an error page.
 */
function readCountryCodeParam(searchParams: RawSearchParams, key: string): string | undefined {
  const rawValue = readSingleParam(searchParams, key);
  if (rawValue === undefined) return undefined;
  const upperCased = rawValue.toUpperCase();
  return /^[A-Z]{2}$/.test(upperCased) ? upperCased : undefined;
}

/**
 * Parse store search URL params into a backend filter.
 *
 * ONLY the keys `/store/search` declares are read. Price range, condition and the four
 * extra sorts that used to live here do not exist on the backend — every one of them was a
 * 422, which is why the search page never rendered a result.
 */
export function readStoreSearchFilter(searchParams: RawSearchParams): StoreSearchFilter {
  return {
    query: readSingleParam(searchParams, "query"),
    category: readSingleParam(searchParams, "category"),
    sellerCountryCode: readCountryCodeParam(searchParams, "sellerCountryCode"),
    providerKind: readEnumParam(searchParams, "providerKind", COMMERCE_PROVIDER_KINDS),
    documentKind: readEnumParam(searchParams, "documentKind", STORE_SEARCH_DOCUMENT_KINDS),
    minOrderQuantityMax: readBoundedIntParam(
      searchParams,
      "minOrderQuantityMax",
      0,
      MAXIMUM_ORDER_QUANTITY_FILTER,
    ),
    sort: readEnumParam(searchParams, "sort", STORE_SEARCH_SORTS),
    cursor: readSingleParam(searchParams, "cursor"),
    limit: readBoundedIntParam(searchParams, "limit", 1, MAXIMUM_SEARCH_LIMIT),
  };
}

/**
 * How many narrowing filters the visitor applied.
 *
 * This counts OUR OWN URL state, not a backend fact — `/store/search` returns no
 * `appliedFilterCount`, and inventing one from the response would be fabricating a value
 * the server never sent. `cursor` and `limit` are paging, not filters, and `sort` does not
 * narrow anything.
 */
export function countAppliedStoreFilters(filter: StoreSearchFilter): number {
  const narrowingValues = [
    filter.query,
    filter.category,
    filter.sellerCountryCode,
    filter.providerKind,
    filter.documentKind,
    filter.minOrderQuantityMax,
  ];
  return narrowingValues.filter((value) => value !== undefined).length;
}

/** Build a store search href with filter patch; clears cursor when filters change. */
export function buildStoreSearchHref(
  pathname: string,
  searchParams: RawSearchParams,
  patch: RawSearchParams,
): string {
  const clearsCursor = !("cursor" in patch);
  const nextHref = buildFilterHref(searchParams, {
    ...patch,
    ...(clearsCursor ? { cursor: undefined } : {}),
  });
  return `${pathname}${nextHref === "?" ? "" : nextHref}`;
}
