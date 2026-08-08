// TRANSPORT: client-query — React Query over the PUBLIC category reads in
// `@/lib/store/catalog.api`, for the one surface that needs them from the browser: the
// studio listing wizard's category picker.
//
// The storefront's own category reads deliberately have NO hook. `/store` and
// `/store/categories` are server components that await the same functions directly, which is
// why `catalog.api.ts` threads `RequestOptions` rather than assuming a transport.
"use client";

import { useQuery } from "@tanstack/react-query";

import { unwrap } from "@/lib/http";
import { listOwnStoreCategoryRequests } from "@/lib/store/admin-categories.api";
import { listStoreCategories } from "@/lib/store/catalog.api";

export const storeCategoryBrowseKeys = {
  all: ["store-category-browse"] as const,
  level: (parentCategoryId: string | null) =>
    ["store-category-browse", "level", parentCategoryId ?? "root"] as const,
  ownRequests: () => ["store-category-browse", "own-requests"] as const,
};

/**
 * One level of the active category tree: the roots, or one category's children.
 *
 * ONE LEVEL AT A TIME, matching the route. The picker walks down rather than fetching the
 * whole tree because the backend only accepts an ACTIVE LEAF as a listing's category, and
 * walking is what makes "this root has children, so pick one of them" expressible without
 * the client deciding for itself what a leaf is.
 *
 * `isEnabled` is false while nothing is selected, so choosing no root fires no child read.
 */
export function useStoreCategoryLevelQuery(parentCategoryId: string | null, isEnabled = true) {
  return useQuery({
    queryKey: storeCategoryBrowseKeys.level(parentCategoryId),
    queryFn: async () =>
      unwrap(
        await listStoreCategories(
          parentCategoryId === null ? {} : { parentCategoryId },
          // The seller has just been told what to pick from; a cached level from before an
          // admin published a category would be the wrong list.
          { cache: "no-store" },
        ),
      ).items,
    enabled: isEnabled,
  });
}

/**
 * The caller's own category requests.
 *
 * WHY THE PICKER NEEDS THIS. A seller listing five products in a category that does not
 * exist yet should ask once, not five times — the queue would otherwise fill with duplicates
 * of the same ask and a moderator would have to approve one and reject four. Offering the
 * pending ones back lets the second listing attach to the first request.
 *
 * `retry: false` because an unauthenticated caller gets a 401, which is an answer.
 */
export function useOwnStoreCategoryRequestsQuery(isEnabled: boolean) {
  return useQuery({
    queryKey: storeCategoryBrowseKeys.ownRequests(),
    queryFn: async () => unwrap(await listOwnStoreCategoryRequests()),
    enabled: isEnabled,
    retry: false,
  });
}
