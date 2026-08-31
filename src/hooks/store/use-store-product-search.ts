"use client";

// TRANSPORT: client-query — `GET /store/search`, scoped to products.
//
// THE FIRST CLIENT-SIDE CATALOG SEARCH IN THIS FRONTEND. `searchStore` has existed for a while but
// had only two callers, both server-side (the search page and the sitemap builder), so there was no
// hook. The wrapper already threads `RequestOptions` and `getJson` is isomorphic, so this is a hook
// over an existing transport rather than a new one.
//
// ⚠️ **`documentKind: "product"` IS NOT OPTIONAL.** An unfiltered `/store/search` returns
// ORGANIZATION hits alongside products — a flat, denormalized index serving both entities — and
// treating one as the other has broken a page in this codebase before. A candidate picker that
// offered a supplier as a product would send an organization id to a route expecting a product.
//
// ⚠️ **DO NOT RE-SORT OR RE-FILTER THE PAGE.** The server ordered it and the cursor encodes that
// order; re-sorting a keyset page client-side breaks paging, which `catalog.schemas.ts` states
// outright.

import { useQuery } from "@tanstack/react-query";

import type { ActionResponse } from "@/lib/http";
import { searchStore } from "@/lib/store/catalog.api";
import type { StoreSearchPage } from "@/lib/store/catalog.schemas";

/** Below this a query is a keystroke rather than a search, and the server should not see it. */
const MINIMUM_QUERY_LENGTH = 2;

export const storeProductSearchKeys = {
  all: ["store", "product-search"] as const,
  forQuery: (query: string) => ["store", "product-search", query] as const,
};

/**
 * Searches products by text.
 *
 * `enabled` on the trimmed length rather than a debounce timer: React Query already dedupes and
 * caches per key, so a reader typing "chair" issues one request per distinct prefix and then
 * reads the cache when they backspace. `placeholderData` is deliberately NOT set — showing the
 * previous query's hits under a new query is how somebody picks the wrong product.
 */
export function useStoreProductSearchQuery(query: string) {
  const trimmedQuery = query.trim();
  return useQuery<ActionResponse<StoreSearchPage>>({
    queryKey: storeProductSearchKeys.forQuery(trimmedQuery),
    queryFn: () => searchStore({ query: trimmedQuery, documentKind: "product", limit: 10 }),
    enabled: trimmedQuery.length >= MINIMUM_QUERY_LENGTH,
    retry: false,
  });
}
