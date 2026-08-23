"use client";

// TRANSPORT: client-query — query-key factory for the home feed and engagement surface.
// Its own namespace rather than an entry in `rndKeys`, which scopes itself to R&D; same
// arrangement as `productKeys` and `promotionalSlideKeys`.
//
// NO PAGE, NO CURSOR, NO RANK SEED IN ANY KEY. Both paginated reads here accumulate their
// pages under ONE key — `useInfiniteQuery` holds the pages, so putting the page number in the
// key would give every page its own cache entry and the list would reset on each fetch.
//
// The `rankSeed` is likewise not a key input even though it changes the response. It is pinned
// FOR a query, not a dimension OF it: a new seed means the same feed re-ranked, and cutting a
// new cache entry for it would leave the old pages orphaned mid-scroll. Only server FILTERS
// belong in a key.

import type { FeedMode } from "@/lib/feed/schemas";

/**
 * The filters that change which rows `GET /feed/videos` returns.
 *
 * Declared as an interface rather than positional arguments so the key factory and the island
 * cannot drift apart — adding a facet is a compile error at both ends.
 */
export interface FeedVideoListFilter {
  readonly mode: FeedMode;
  readonly categorySlug: string | undefined;
}

export const feedKeys = {
  all: ["feed"] as const,

  // --- Categories ---
  categories: () => ["feed", "categories"] as const,

  // --- Videos ---
  videosRoot: () => ["feed", "videos"] as const,
  videos: (filter: FeedVideoListFilter) =>
    ["feed", "videos", filter.mode, filter.categorySlug] as const,

  // --- Search ---
  // The query text IS the identity of the list — two different searches are two different
  // results, not two pages of one. Same rule as `videos(filter)` above: server filters belong
  // in the key, and nothing else does.
  searchRoot: () => ["feed", "search"] as const,
  search: (query: string) => ["feed", "search", query] as const,

  // --- Watch ---
  watch: (videoId: string) => ["feed", "watch", videoId] as const,

  // --- Feed preferences ---
  // NO VIEWER ID IN THE KEY, even though the route is `/users/me/…` and the answer is
  // per-viewer. The session cookie decides who "me" is, and the whole cache is torn down on
  // sign-out — the same reason no other key here carries one.
  mutedCreators: () => ["feed", "muted-creators"] as const,
  // NO CURSOR, per the banner at the top of this file: `useKeysetList` holds the accumulated
  // pages under this one key, and putting the cursor in would cut a fresh cache entry per page
  // and reset the list on every "Show more".
  notInterestedVideos: () => ["feed", "not-interested-videos"] as const,

  // --- Comments ---
  // `parentCommentId` is part of the identity: the top-level thread and one comment's replies
  // are different lists with different sort orders, served by the same route.
  commentsRoot: (videoId: string) => ["feed", "comments", videoId] as const,
  comments: (videoId: string, parentCommentId: string | undefined) =>
    ["feed", "comments", videoId, parentCommentId] as const,
} as const;
