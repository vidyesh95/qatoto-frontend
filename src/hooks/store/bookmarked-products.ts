"use client";

// TRANSPORT: client-query — React Query over `GET /commerce/bookmarked-products`.

import { useQuery } from "@tanstack/react-query";

import { storeKeys } from "@/hooks/store/keys";
import { listBookmarkedProducts } from "@/lib/store/catalog.api";
import type { ListBookmarkedProductsFilter } from "@/lib/store/catalog.schemas";

/**
 * The caller's wishlist — the products they BOOKMARKED.
 *
 * LIKES ARE NOT HERE AND ARE NOT MISSING. The route this reads used to return both kinds when no
 * `kind` was named, which put every hearted product in the buyer's wishlist. A like is a public
 * counter on one product; it is not a list and there is no query for one.
 *
 * `retry: false` — a 401 or a 403 here is an answer about the session, not a flake.
 *
 * NOT SEEDED FROM THE ENGAGEMENT CACHE, deliberately. `storeKeys.productEngagement` holds the
 * per-product toggle state that `useProductEngagement` writes, and building the list from it would
 * only ever show the products the buyer had visited this session. The set lives on the server.
 *
 * Kept fresh by `useToggleProductBookmarked`, which invalidates this key on every successful
 * write — do not rely on the default `staleTime: 0` to do that job.
 */
export function useBookmarkedProductsQuery(filter: ListBookmarkedProductsFilter = {}) {
  return useQuery({
    queryKey: storeKeys.bookmarkedProducts(),
    queryFn: () => listBookmarkedProducts(filter),
    retry: false,
  });
}
