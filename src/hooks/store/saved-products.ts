"use client";

// TRANSPORT: client-query — React Query over `GET /commerce/saved-products`.

import { useQuery } from "@tanstack/react-query";

import { storeKeys } from "@/hooks/store/keys";
import { listSavedProducts } from "@/lib/store/catalog.api";
import type { ListSavedProductsFilter } from "@/lib/store/catalog.schemas";

/**
 * The caller's saved and bookmarked listings.
 *
 * `retry: false` — a 401 or a 403 here is an answer about the session, not a flake.
 *
 * NOT SEEDED FROM THE ENGAGEMENT CACHE, deliberately. `storeKeys.productEngagement` holds the
 * per-product toggle state that `useProductEngagement` writes, and building the list from it would
 * only ever show the products the buyer had visited this session. The set lives on the server.
 */
export function useSavedProductsQuery(filter: ListSavedProductsFilter = {}) {
  return useQuery({
    queryKey: storeKeys.savedProducts(filter.kind),
    queryFn: () => listSavedProducts(filter),
    retry: false,
  });
}
