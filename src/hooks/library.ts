"use client";

// TRANSPORT: client-query — React Query over the three `/users/me/*` collection reads.
//
// SESSION-SCOPED, SO NOT PREFETCHED ON THE SERVER. Each describes the caller's own account, and
// `/library` is a client island behind a session — the same arrangement `useCreatorSummaryQuery`
// documents for the studio's analytics reads.
//
// THREE HOOKS, ONE SHAPE. They differ only in which route they call, so the bodies are near
// identical; they are written out rather than folded into one parameterized hook because a query
// KEY has to be a literal a reader can grep for, and a factory that builds keys from an argument
// is how two lists end up sharing a cache entry.

import { useKeysetList, toCursorKeysetPage, type KeysetListResult } from "@/hooks/keyset-list";
import { listMyLikedVideos, listMySavedVideos, listMySubscriptions } from "@/lib/library/api";
import type { LibraryVideoRow, SubscribedCreatorRow } from "@/lib/library/schemas";

export const libraryKeys = {
  likedVideos: () => ["library", "liked-videos"] as const,
  savedVideos: () => ["library", "saved-videos"] as const,
  subscriptions: () => ["library", "subscriptions"] as const,
};

/**
 * The caller's liked videos, newest first.
 *
 * `initialPage: null` because there is no server-rendered page to seed — `/library` fetches on
 * mount. The shared hook's banner is explicit that `null` and an empty page are different things:
 * seeding `{ rows: [] }` would write an authoritative-looking empty page into a cache that never
 * refetches.
 *
 * The `typeof` guard is what the hook's concrete `KeysetToken` union requires of every caller.
 * This read uses the string arm; the token is opaque and server-issued, and constructing one is a
 * 422 by design.
 */
export function useLikedVideosQuery(): KeysetListResult<LibraryVideoRow> {
  return useKeysetList<LibraryVideoRow>({
    queryKey: libraryKeys.likedVideos(),
    initialPage: null,
    fetchPage: async (token) =>
      toCursorKeysetPage(await listMyLikedVideos(typeof token === "string" ? token : null)),
  });
}

/** Watch later. Identical to the liked list one route along. */
export function useSavedVideosQuery(): KeysetListResult<LibraryVideoRow> {
  return useKeysetList<LibraryVideoRow>({
    queryKey: libraryKeys.savedVideos(),
    initialPage: null,
    fetchPage: async (token) =>
      toCursorKeysetPage(await listMySavedVideos(typeof token === "string" ? token : null)),
  });
}

/** The channels the caller follows, newest first. */
export function useSubscriptionsQuery(): KeysetListResult<SubscribedCreatorRow> {
  return useKeysetList<SubscribedCreatorRow>({
    queryKey: libraryKeys.subscriptions(),
    initialPage: null,
    fetchPage: async (token) =>
      toCursorKeysetPage(await listMySubscriptions(typeof token === "string" ? token : null)),
  });
}
